// /api/keys — list + mint Causalist API keys.
// Auth: GitHub OAuth cookie. Keys are scoped to the GitHub user id.

import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE, fetchGithubUser } from "@/lib/auth/github";
import { listKeys, mintKey } from "@/lib/auth/api-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveOwner(req: NextRequest) {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  const user = await fetchGithubUser(token);
  if (!user) return null;
  return { userId: user.id, userLogin: user.login };
}

export async function GET(req: NextRequest): Promise<Response> {
  const owner = await resolveOwner(req);
  if (!owner) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  try {
    const keys = await listKeys(owner);
    return NextResponse.json({ keys });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "list failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const owner = await resolveOwner(req);
  if (!owner) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const name = (body.name ?? "").trim() || "untitled";
  try {
    const { token, record } = await mintKey(owner, name);
    // Plaintext is returned ONCE. The client renders a one-time copy
    // panel; subsequent /api/keys GET only returns prefix + metadata.
    return NextResponse.json({ token, record });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "mint failed" },
      { status: 500 },
    );
  }
}
