// /api/projects/list — cookie-authed listing of all projects the
// current user has built. Reads causalist_session_graphs and filters
// rows whose session_id starts with `user-<userId>-` — same scheme
// the upload-graph + save-graph routes write under.
//
// Used by /app on mount so a fresh browser (no IndexedDB cache) still
// sees the user's full project list pulled from Supabase.

import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE, fetchGithubUser } from "@/lib/auth/github";
import { serverSupabase } from "@/lib/supabase/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RowGraph {
  repo?: string;
  rootLabel?: string;
  commit?: string;
  nodes?: unknown[];
  edges?: unknown[];
}

export async function GET(req: NextRequest): Promise<Response> {
  const cookieToken = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!cookieToken) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const user = await fetchGithubUser(cookieToken);
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const sb = serverSupabase();
  if (!sb) {
    return NextResponse.json({ projects: [] });
  }

  const prefix = `user-${user.id}-`;
  const { data, error } = await sb
    .from("causalist_session_graphs")
    .select("session_id, graph, updated_at")
    .like("session_id", `${prefix}%`)
    .order("updated_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      { error: error.message, projects: [] },
      { status: 500 },
    );
  }

  // Parse each row's session_id back to owner/repo. Format is
  // user-<id>-<owner>-<repo> — owner can have hyphens, repo too.
  // Conservatively split on the LAST hyphen as the owner/repo
  // boundary (matches how upload-graph + save-graph write it).
  const projects = (data ?? []).map((row) => {
    const tail = (row.session_id as string).slice(prefix.length);
    const lastDash = tail.lastIndexOf("-");
    const owner = lastDash >= 0 ? tail.slice(0, lastDash) : tail;
    const repo = lastDash >= 0 ? tail.slice(lastDash + 1) : "";
    const g = (row.graph ?? {}) as RowGraph;
    return {
      owner,
      repo,
      nodeCount: Array.isArray(g.nodes) ? g.nodes.length : 0,
      edgeCount: Array.isArray(g.edges) ? g.edges.length : 0,
      commit: g.commit,
      updatedAt: row.updated_at
        ? new Date(row.updated_at as string).getTime()
        : Date.now(),
    };
  });

  return NextResponse.json({ projects });
}
