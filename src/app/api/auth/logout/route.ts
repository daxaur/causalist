import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/auth/github";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<Response> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TOKEN_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
  });
  return res;
}
