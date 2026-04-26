// /api/projects/upload-graph — Bearer-authed graph upload.
//
// The CLI / MCP / any agent runs the 4-agent build locally (using
// the user's ANTHROPIC_API_KEY env var) and POSTs the resulting
// CausalGraph here. We publish a `graph_uploaded` event on the
// user's SSE channel so any open browser tab can save the entry to
// its local library — same channel as `project_added` from the
// register-only path.
//
// We also stash the graph in causalist_session_graphs keyed by a
// deterministic session id (`user-<userId>-<owner>-<repo>`) so a
// future re-fetch endpoint can serve it back if the user opens the
// app cold without their library populated.

import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth/api-keys";
import { publish } from "@/lib/stream/memory-bus";
import { serverSupabase } from "@/lib/supabase/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UploadBody {
  owner: string;
  repo: string;
  nickname?: string;
  graph: {
    repo: string;
    rootLabel?: string;
    commit?: string;
    nodes: unknown[];
    edges: unknown[];
  };
}

function userChannel(userId: number): string {
  return `user-${userId}`;
}

function graphSessionId(userId: number, owner: string, repo: string): string {
  // Deterministic so re-uploads overwrite the same row.
  return `user-${userId}-${owner}-${repo}`;
}

export async function POST(req: Request): Promise<Response> {
  const owner = await requireApiKey(req);
  if (!owner) {
    return NextResponse.json(
      { error: "missing or invalid Bearer token" },
      { status: 401 },
    );
  }

  let body: UploadBody;
  try {
    body = (await req.json()) as UploadBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body.owner || !body.repo) {
    return NextResponse.json(
      { error: "owner and repo are required" },
      { status: 400 },
    );
  }
  if (
    !body.graph ||
    !Array.isArray(body.graph.nodes) ||
    !Array.isArray(body.graph.edges)
  ) {
    return NextResponse.json(
      { error: "graph must include nodes[] and edges[]" },
      { status: 400 },
    );
  }

  // Persist to session_graphs so cold loads can read it back.
  // Best-effort — if Supabase is unavailable we still publish the SSE.
  const sb = serverSupabase();
  if (sb) {
    const sessionId = graphSessionId(owner.userId, body.owner, body.repo);
    const { error } = await sb
      .from("causalist_session_graphs")
      .upsert(
        { session_id: sessionId, graph: body.graph },
        { onConflict: "session_id" },
      );
    if (error) {
      // Don't fail the whole request — the live SSE path still works.
      console.warn("[upload-graph] supabase upsert failed:", error.message);
    }
  }

  publish(userChannel(owner.userId), {
    event: "graph_uploaded",
    ts: Date.now(),
    project: {
      owner: body.owner,
      repo: body.repo,
      nickname: body.nickname,
    },
    graph: body.graph,
  });

  return NextResponse.json({
    ok: true,
    project: { owner: body.owner, repo: body.repo },
    viewerUrl: `https://causalist.xyz/app/${body.owner}/${body.repo}`,
    persisted: Boolean(sb),
  });
}
