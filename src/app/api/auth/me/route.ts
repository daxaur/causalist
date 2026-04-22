import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE, fetchGithubUser } from "@/lib/auth/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 *
 * Returns { login, avatar_url, token } if the user has a GitHub OAuth
 * cookie. The token is returned so the browser-side Octokit calls can
 * reuse it. Not a security risk in this model: the app already trusts
 * the user's browser with their own credentials (PAT flow works the
 * same way).
 */
export async function GET(req: NextRequest): Promise<Response> {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ authenticated: false });

  const user = await fetchGithubUser(token);
  if (!user) {
    // Token expired or revoked — clear the cookie
    const res = NextResponse.json({ authenticated: false });
    res.cookies.set(TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  return NextResponse.json({
    authenticated: true,
    login: user.login,
    avatar_url: user.avatar_url,
    token,
  });
}
