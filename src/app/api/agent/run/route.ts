// SSE endpoint for real-time agent runs. Body shape:
//   { agent, repo, branch, selectedNodeIds, nodePathMap, apiKey }
// Streams `event: <type>\ndata: <json>\n\n` lines to the client.
// The agent runner reads files from GitHub (using the user's OAuth
// token cookie when available), calls Claude Opus 4.7 via the Agent
// SDK, and emits findings + patches as discrete events. The client
// uses a separate POST to /api/agent/push-pr to actually open a PR.

import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/auth/github";
import { runAgent, type AgentEvent } from "@/lib/agents/run";

export const runtime = "nodejs";
export const maxDuration = 300;

interface RunBody {
  plan: string;
  repo: string;
  branch?: string;
  selectedNodeIds: string[];
  nodePathMap: Record<string, string>;
  apiKey: string;
  /** Optional model override; defaults to claude-opus-4-7. */
  model?: string;
  /** Number of parallel causal-lens agents (1..5). Defaults to 1. */
  agents?: number;
  /** Optional per-node graph context (path + summary). Used by the
   *  prompt when source files can't be fetched. */
  selectedNodeContext?: { id: string; path?: string; summary?: string }[];
}

export async function POST(req: Request): Promise<Response> {
  let body: RunBody;
  try {
    body = (await req.json()) as RunBody;
  } catch {
    return new Response("invalid JSON", { status: 400 });
  }

  if (
    !body.plan ||
    !body.plan.trim() ||
    !body.repo ||
    !body.apiKey ||
    !Array.isArray(body.selectedNodeIds) ||
    typeof body.nodePathMap !== "object"
  ) {
    return new Response("missing fields", { status: 400 });
  }

  // GitHub token lookup — OAuth cookie first, fallback to header.
  const cookieStore = await cookies();
  const ghToken =
    cookieStore.get(TOKEN_COOKIE)?.value ?? req.headers.get("x-gh-token") ?? undefined;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: AgentEvent) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`,
            ),
          );
        } catch {
          // controller closed; ignore
        }
      };

      const ac = new AbortController();
      // Cancel agent work if the client disconnects mid-stream.
      req.signal.addEventListener("abort", () => ac.abort());

      try {
        for await (const ev of runAgent({
          apiKey: body.apiKey,
          plan: body.plan,
          model: body.model,
          agents: body.agents,
          repo: body.repo,
          branch: body.branch ?? "main",
          selectedNodeIds: body.selectedNodeIds,
          nodePathMap: body.nodePathMap,
          githubToken: ghToken,
          selectedNodeContext: body.selectedNodeContext,
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
