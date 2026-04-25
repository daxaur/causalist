import { NextRequest, NextResponse } from "next/server";
import {
  STATE_COOKIE,
  TOKEN_COOKIE,
  exchangeCodeForToken,
  oauthConfigured,
} from "@/lib/auth/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/github/callback?code=...&state=...
 *
 * GitHub redirects here after the user approves. We verify the state
 * cookie, exchange the code for an access token, drop it into an
 * httpOnly cookie, and bounce to /app.
 */
export async function GET(req: NextRequest): Promise<Response> {
  if (!oauthConfigured()) {
    return NextResponse.redirect(
      new URL("/app/settings?oauth=unconfigured", req.url),
    );
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expected = req.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state) {
    return NextResponse.redirect(new URL("/app/settings?oauth=bad", req.url));
  }
  if (!expected || expected !== state) {
    return NextResponse.redirect(new URL("/app/settings?oauth=state", req.url));
  }

  try {
    const token = await exchangeCodeForToken(code);
    const res = NextResponse.redirect(new URL("/app?oauth=ok", req.url));
    res.cookies.set(TOKEN_COOKIE, token.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    // clear the state cookie
    res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    const msg = encodeURIComponent(
      e instanceof Error ? e.message : "unknown error",
    );
    return NextResponse.redirect(
      new URL(`/app/settings?oauth=failed&err=${msg}`, req.url),
    );
  }
}
