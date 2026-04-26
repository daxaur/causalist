// /api/projects — POST creates a project, GET lists them.
//
// POST: Bearer API key auth. The agent (Claude Code via MCP, a CI job,
// anything) hits this with `Authorization: Bearer cspl_live_…` and a
// GitHub URL. We resolve the key to its owner, publish a
// `project_added` event on the user's SSE channel (so any logged-in
// browser tab adds it to the library immediately), and return the
// viewer URL the agent can show the user.
//
// All projects are private to the user who owns the API key. There's
// no public-vs-private flag — public sharing happens via the explicit
// /s/[id] share-link flow, not project creation.

import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth/api-keys";
import { publish } from "@/lib/stream/memory-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GITHUB_URL = /github\.com\/([^/\s]+)\/([^/\s?#]+)/;

interface CreateBody {
  /** GitHub URL or "owner/repo" shorthand. */
  githubUrl?: string;
  owner?: string;
  repo?: string;
  /** Optional friendly name for the projects list. */
  nickname?: string;
}

function userChannel(userId: number): string {
  return `user-${userId}`;
}

export async function POST(req: Request): Promise<Response> {
  const owner = await requireApiKey(req);
  if (!owner) {
    return NextResponse.json(
      { error: "missing or invalid Bearer token" },
      { status: 401 },
    );
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  let repoOwner = body.owner;
  let repoName = body.repo;
  if (!repoOwner || !repoName) {
    const url = body.githubUrl ?? "";
    const m = url.match(GITHUB_URL);
    if (!m) {
      return NextResponse.json(
        {
          error:
            "supply { githubUrl } or { owner, repo }. githubUrl must point at a github.com repo.",
        },
        { status: 400 },
      );
    }
    repoOwner = m[1];
    repoName = m[2].replace(/\.git$/, "");
  }

  const project = {
    owner: repoOwner,
    repo: repoName,
    nickname: body.nickname,
    addedAt: Date.now(),
  };

  // Push to the user's SSE channel — any open browser tab signed in
  // with the same GitHub identity will receive it and add to its
  // library (the analyze itself runs there when the user opens the
  // project, so the user's Anthropic key never has to leave their
  // browser).
  publish(userChannel(owner.userId), {
    event: "project_added",
    ts: Date.now(),
    project,
  });

  const viewerUrl = `https://causalist.xyz/app/${repoOwner}/${repoName}`;
  return NextResponse.json({
    ok: true,
    project,
    viewerUrl,
    note:
      "Open the viewerUrl in a browser signed in with the same GitHub identity to run the build.",
  });
}

/** GET — also Bearer-authed. Echoes the owner so an agent can verify
 *  its key is valid before doing real work. */
export async function GET(req: Request): Promise<Response> {
  const owner = await requireApiKey(req);
  if (!owner) {
    return NextResponse.json(
      { error: "missing or invalid Bearer token" },
      { status: 401 },
    );
  }
  return NextResponse.json({
    ok: true,
    user: { id: owner.userId, login: owner.userLogin },
    keyId: owner.id,
    keyName: owner.name,
  });
}
