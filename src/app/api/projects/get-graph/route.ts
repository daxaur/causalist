// /api/projects/get-graph?owner=X&repo=Y — cookie-authed graph fetch.
//
// The browser calls this when /app/owner/repo opens cold (no library
// entry yet). If a graph was previously built (either browser or
// terminal) and saved to Supabase, we return it so the user doesn't
// have to rebuild from scratch on a new device.

import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE, fetchGithubUser } from "@/lib/auth/github";
import { serverSupabase } from "@/lib/supabase/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const cookieToken = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!cookieToken) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const user = await fetchGithubUser(cookieToken);
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const owner = req.nextUrl.searchParams.get("owner");
  const repo = req.nextUrl.searchParams.get("repo");
  if (!owner || !repo) {
    return NextResponse.json(
      { error: "owner and repo query params required" },
      { status: 400 },
    );
  }

  const sb = serverSupabase();
  if (!sb) {
    return NextResponse.json({ found: false });
  }

  const sessionId = `user-${user.id}-${owner}-${repo}`;
  const { data, error } = await sb
    .from("causalist_session_graphs")
    .select("graph")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: error.message, found: false },
      { status: 500 },
    );
  }
  if (!data?.graph) {
    return NextResponse.json({ found: false });
  }
  return NextResponse.json({ found: true, graph: data.graph });
}
