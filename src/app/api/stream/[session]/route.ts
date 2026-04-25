import type { NextRequest } from "next/server";
import { subscribe, type StreamEvent } from "@/lib/stream/memory-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stream/<session>
 *
 * Server-Sent Events fan-out. Browser subscribes via EventSource:
 *
 *   new EventSource('/api/stream/<session>')
 *
 * Each Claude Code hook event arrives as `event: tool` with the JSON
 * payload. A heartbeat comment fires every 15s so proxies don't drop
 * the connection.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ session: string }> },
): Promise<Response> {
  const { session } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`: connected ${session}\n\n`));

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: hb\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      const unsubscribe = subscribe(session, (event: StreamEvent) => {
        // Default channel is "tool" (Claude Code hook events). Custom
        // channels — e.g. "project_added" pushed via /api/projects/push
        // — set their own `event` so the browser can `addEventListener`
        // for the specific name.
        const channel = typeof event.event === "string" ? event.event : "tool";
        controller.enqueue(
          encoder.encode(`event: ${channel}\ndata: ${JSON.stringify(event)}\n\n`),
        );
      });

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
