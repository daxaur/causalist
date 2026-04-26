// /api/projects/delete?owner=X&repo=Y — cookie-authed graph deletion.
//
// Removes the user's saved graph row from causalist_session_graphs so
// the next visit to /app/owner/repo no longer hydrates from the server
// and the user can re-run the build from scratch. The browser is
// expected to also clear its local IndexedDB entry; this route only
// owns the server-side copy.

import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE, fetchGithubUser } from "@/lib/auth/github";
import { serverSupabase } from "@/lib/supabase/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest): Promise<Response> {
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
    // No persistence configured — nothing to drop, treat as success
    // so the client can still wipe its local copy.
    return NextResponse.json({ ok: true, persisted: false });
  }

  const sessionId = `user-${user.id}-${owner}-${repo}`;
  const { error } = await sb
    .from("causalist_session_graphs")
    .delete()
    .eq("session_id", sessionId);
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
