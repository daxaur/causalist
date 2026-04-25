import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import {
  STATE_COOKIE,
  buildAuthorizeUrl,
  oauthConfigured,
} from "@/lib/auth/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/github/login
 *
 * Kicks off the OAuth dance. If OAuth isn't configured server-side we
 * redirect to /settings where the PAT-based connect flow lives.
 */
export async function GET(): Promise<Response> {
  if (!oauthConfigured()) {
    return NextResponse.redirect(
      new URL("/app/settings?oauth=unconfigured", defaultOrigin()),
    );
  }

  const state = randomBytes(16).toString("hex");
  const url = buildAuthorizeUrl(state);

  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure(),
    path: "/",
    maxAge: 600, // 10 minutes
  });
  return res;
}

function defaultOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:4141")
  );
}

function isSecure(): boolean {
  return defaultOrigin().startsWith("https://");
}
