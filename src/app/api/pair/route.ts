import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { claimCode, mintCode } from "@/lib/pair/store";
import { publish } from "@/lib/stream/memory-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/pair — browser calls this to mint a new pair code.
 * Returns { code, sessionId } — the browser shows the code and starts
 * subscribing to /api/stream/<sessionId>.
 */
export async function POST(): Promise<Response> {
  const sessionId = crypto.randomUUID();
  const token = randomBytes(24).toString("base64url");
  const code = await mintCode(sessionId, token);
  return NextResponse.json({ code, sessionId });
}

/**
 * GET /api/pair?code=ABC123 — CLI calls this to exchange the code for
 * credentials. Single-use: a code that's already been claimed returns
 * 410 Gone.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });
  const claim = await claimCode(code.toUpperCase());
  if (!claim) {
    return NextResponse.json(
      { error: "invalid or already-used code" },
      { status: 410 },
    );
  }
  // Notify the subscribed browser so it can flip the UI.
  publish(claim.sessionId, {
    event: "paired",
    ts: Date.now(),
    claimedAt: claim.claimedAt,
  });
  return NextResponse.json({
    sessionId: claim.sessionId,
    token: claim.token,
  });
}
