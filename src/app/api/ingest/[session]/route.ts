import type { NextRequest } from "next/server";
import { publish } from "@/lib/stream/memory-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ingest/<session>
 *
 * Claude Code hooks POST here with tool-use and lifecycle events.
 * The request body is the Claude Code hook stdin JSON: { session_id,
 * transcript_path, cwd, hook_event_name, tool_name?, tool_input?, ... }.
 *
 * We publish each event to the in-memory bus keyed by <session>. The
 * web viewer subscribes to `/api/stream/<session>` and receives them.
 *
 * Auth model (MVP): pairing-code based. The `Authorization: Bearer`
 * header carries a token minted when the user runs `causalist pair`.
 * A production deploy swaps the memory bus for Upstash Redis; this
 * route's contract stays unchanged.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ session: string }> },
): Promise<Response> {
  const { session } = await params;
  const eventName =
    req.headers.get("x-causalist-event") ?? "UnknownHookEvent";

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("invalid JSON", { status: 400 });
  }

  publish(session, {
    event: eventName,
    ts: Date.now(),
    ...body,
  });

  return Response.json({ ok: true });
}
