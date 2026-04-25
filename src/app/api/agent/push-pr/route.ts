// Opens a real GitHub PR with the patches an agent produced. Multi-file
// commits are built via the Tree+Commit API so we can apply N edits in
// a single commit. Branch name auto-generated from agent + timestamp.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/auth/github";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PushBody {
  repo: string; // "owner/name"
  baseBranch: string; // e.g. "main"
  branchName?: string; // optional — server generates if omitted
  prTitle: string;
  prBody: string;
  files: { path: string; content: string }[];
}

export async function POST(req: Request): Promise<Response> {
  let body: PushBody;
  try {
    body = (await req.json()) as PushBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body.repo || !body.baseBranch || !Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token =
    cookieStore.get(TOKEN_COOKIE)?.value ?? req.headers.get("x-gh-token");
  if (!token) {
    return NextResponse.json(
      { error: "Not signed in to GitHub", needsAuth: true },
      { status: 401 },
    );
  }

  const [owner, repo] = body.repo.split("/");
  if (!owner || !repo) {
    return NextResponse.json({ error: "bad repo" }, { status: 400 });
  }

  const branchName =
    body.branchName ??
    `causalist/agent-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;

  try {
    const { Octokit } = await import("@octokit/rest");
    const oc = new Octokit({ auth: token });

    // 1. Resolve base branch SHA.
    const baseRef = await oc.git.getRef({
      owner,
      repo,
      ref: `heads/${body.baseBranch}`,
    });
    const baseSha = baseRef.data.object.sha;

    // 2. Create the new branch.
    await oc.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    // 3. Build a single tree with all updated blobs.
    const baseCommit = await oc.git.getCommit({
      owner,
      repo,
      commit_sha: baseSha,
    });
    const baseTreeSha = baseCommit.data.tree.sha;

    const blobs = await Promise.all(
      body.files.map(async (f) => {
        const blob = await oc.git.createBlob({
          owner,
          repo,
          content: f.content,
          encoding: "utf-8",
        });
        return {
          path: f.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blob.data.sha,
        };
      }),
    );

    const tree = await oc.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: blobs,
    });

    // 4. Commit + advance the branch ref.
    const commit = await oc.git.createCommit({
      owner,
      repo,
      message: body.prTitle,
      tree: tree.data.sha,
      parents: [baseSha],
    });

    await oc.git.updateRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
      sha: commit.data.sha,
    });

    // 5. Open the PR.
    const pr = await oc.pulls.create({
      owner,
      repo,
      title: body.prTitle,
      body: body.prBody,
      head: branchName,
      base: body.baseBranch,
    });

    return NextResponse.json({
      prUrl: pr.data.html_url,
      prNumber: pr.data.number,
      branch: branchName,
    });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const message =
      e instanceof Error ? e.message : "Failed to open pull request";
    return NextResponse.json({ error: message }, { status });
  }
}
