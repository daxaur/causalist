// /api/agent/managed-query — POST { question, graph, context?, apiKey }
//
// Streams a Claude Managed Agents Q&A run as SSE. Each event is a
// JSON-serialized ManagedEvent on a typed channel:
//   event: session_started | text | tool_use | tool_result | done | error
//
// The server creates (or reuses) a Causalist Oracle agent + cloud
// environment per Anthropic key, opens a session per question,
// executes our 10 graph-query tools in-process when the agent emits
// custom_tool_use, and replies via the session events channel.

import type { NextRequest } from "next/server";
import { runManaged, type ManagedEvent } from "@/lib/agents/managed";
import type { CausalGraph } from "@/lib/graph/types";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Body {
  question: string;
  graph: CausalGraph;
  context?: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  const apiKey = auth.replace(/^Bearer\s+/, "").trim();
  if (!apiKey) {
    return new Response("missing Authorization: Bearer <anthropic-key>", {
      status: 401,
    });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response("invalid JSON", { status: 400 });
  }

  if (!body.question || typeof body.question !== "string") {
    return new Response("question is required", { status: 400 });
  }
  if (
    !body.graph ||
    !Array.isArray(body.graph.nodes) ||
    !Array.isArray(body.graph.edges)
  ) {
    return new Response("graph with nodes[] + edges[] is required", {
      status: 400,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: ManagedEvent) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`,
            ),
          );
        } catch {
          // controller closed — silent
        }
      };

      const ac = new AbortController();
      req.signal.addEventListener("abort", () => ac.abort());

      try {
        for await (const ev of runManaged({
          apiKey,
          graph: body.graph,
          question: body.question,
          context: body.context,
          signal: ac.signal,
        })) {
          send(ev);
          if (ev.type === "done" || ev.type === "error") break;
        }
      } catch (e) {
        send({
          type: "error",
          message: e instanceof Error ? e.message : String(e),
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
      "X-Accel-Buffering": "no",
    },
  });
}
