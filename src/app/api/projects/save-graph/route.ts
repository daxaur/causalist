// /api/projects/save-graph — cookie-authed graph upload.
//
// Sibling to /api/projects/upload-graph (Bearer-authed for agents).
// Used by the in-browser build path so a graph the user just built
// in /app/owner/repo also persists to Supabase, not just IndexedDB.
// Same storage shape (causalist_session_graphs keyed by
// user-<userId>-<owner>-<repo>) so either path can be read back.

import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE, fetchGithubUser } from "@/lib/auth/github";
import { serverSupabase } from "@/lib/supabase/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SaveBody {
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

export async function POST(req: NextRequest): Promise<Response> {
  const cookieToken = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!cookieToken) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const user = await fetchGithubUser(cookieToken);
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  let body: SaveBody;
  try {
    body = (await req.json()) as SaveBody;
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

  const sb = serverSupabase();
  if (!sb) {
    // No persistence configured — return ok=true so the browser
    // doesn't error out, but signal that nothing was stored.
    return NextResponse.json({ ok: true, persisted: false });
  }

  const sessionId = `user-${user.id}-${body.owner}-${body.repo}`;
  const { error } = await sb
    .from("causalist_session_graphs")
    .upsert(
      { session_id: sessionId, graph: body.graph },
      { onConflict: "session_id" },
    );
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, persisted: false },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, persisted: true });
}
