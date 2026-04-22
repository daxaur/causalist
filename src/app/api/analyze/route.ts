import type { NextRequest } from "next/server";
import { runAnalyze, type AgentEvent, type AnalyzeInput } from "@/lib/analyze/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/analyze
 *
 * Body: AnalyzeInput (minus apiKey — supplied as Authorization: Bearer)
 *
 * Streams Server-Sent Events as agents complete. Each event is a JSON-
 * serialized AgentEvent on the `agent` SSE channel. When the final
 * `done` event fires the graph payload is the final CausalGraph.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  const apiKey = auth.replace(/^Bearer\s+/, "").trim();
  if (!apiKey) {
    return new Response("missing Authorization: Bearer <anthropic-key>", {
      status: 401,
    });
  }

  let body: Omit<AnalyzeInput, "apiKey">;
  try {
    body = await req.json();
  } catch {
    return new Response("invalid JSON body", { status: 400 });
  }

  if (!body.owner || !body.repo || !Array.isArray(body.tree)) {
    return new Response("body must include { owner, repo, tree[] }", {
      status: 400,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        const iter = runAnalyze({ ...body, apiKey });
        while (true) {
          const { value, done } = await iter.next();
          if (done) {
            send("done", value);
            break;
          }
          const event: AgentEvent = value;
          send("agent", event);
        }
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
      }
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
