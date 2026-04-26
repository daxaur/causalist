// /api/keys/[id] — revoke a Causalist API key.

import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE, fetchGithubUser } from "@/lib/auth/github";
import { revokeKey } from "@/lib/auth/api-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const cookieToken = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!cookieToken) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const user = await fetchGithubUser(cookieToken);
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const ok = await revokeKey(
      { userId: user.id, userLogin: user.login },
      id,
    );
    if (!ok) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "revoke failed" },
      { status: 500 },
    );
  }
}
