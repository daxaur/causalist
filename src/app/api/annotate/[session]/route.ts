import type { NextRequest } from "next/server";
import { publish } from "@/lib/stream/memory-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/annotate/<session>
 *
 * Body: {
 *   repo: "owner/name",
 *   nodeIds: string[],
 *   status: "failed" | "fixed" | "risky" | "cleared",
 *   note?: string,
 *   source?: "claude-code" | "github-actions" | "user"
 * }
 *
 * Used by the Claude Code plugin (and any agent) to mark nodes as
 * failing, fixed, or at risk. The viewer subscribed to
 * /api/stream/<session> receives these live and colors the nodes
 * accordingly. Minimal auth for now (same model as the ingest route).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ session: string }> },
): Promise<Response> {
  const { session } = await params;
  let body: {
    repo?: string;
    nodeIds?: string[];
    status?: string;
    note?: string;
    source?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("invalid JSON", { status: 400 });
  }

  if (!Array.isArray(body.nodeIds) || body.nodeIds.length === 0) {
    return new Response("body must include nodeIds: string[]", { status: 400 });
  }
  if (!body.status) {
    return new Response("body must include status", { status: 400 });
  }

  publish(session, {
    event: "annotation",
    ts: Date.now(),
    repo: body.repo,
    nodeIds: body.nodeIds,
    status: body.status,
    note: body.note,
    source: body.source ?? "user",
  });

  return Response.json({ ok: true, published: body.nodeIds.length });
}
