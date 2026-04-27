// Claude Managed Agents wrapper for the Causalist Ask flow.
//
// One agent ("Causalist Oracle") is created per Anthropic key on first
// use and cached. Each user question opens a fresh session bound to
// that agent + a shared environment. We stream session events, run our
// 10 graph-query tools in-process when the agent emits
// `agent.custom_tool_use`, and reply with `user.custom_tool_result`.
// Multi-turn tool use lets Claude chain queries (find_node →
// blast_radius → find_path) to answer one question — single-shot
// `messages.stream` couldn't reach that depth.
//
// Beta header `managed-agents-2026-04-01` is auto-set by the SDK on
// `client.beta.{agents,environments,sessions,...}.*`.

import Anthropic from "@anthropic-ai/sdk";
import { TOOL_SCHEMAS, runTool } from "@/lib/analyze/tools";
import type { CausalGraph } from "@/lib/graph/types";

const DEFAULT_MODEL = "claude-opus-4-7";
const ENV_NAME = "causalist";
const AGENT_NAME = "Causalist Oracle";

const SYSTEM_PROMPT = `You are the Causalist Oracle — an expert at reasoning over causal graphs of source code.

You answer the user's question by querying the causal graph through the 10 tools available to you. Always favor multiple short, targeted tool calls over one big one. Typical patterns:

- "What breaks if I change X?" → query_node(X) → blast_radius(X) → maybe affected_tests over the result
- "Who writes to Y?" → find_writers(Y) → for each, query_node + get_neighbors
- "How does A reach B?" → find_path(A, B), then verify_edge for any unclear hop
- "Find code like Z" → similar_nodes(Z, limit) → query_node on top results

When you have enough evidence, write a short, concrete answer in markdown. Cite nodes by their id in backticks. Don't dump tool output — synthesize it.

If a tool returns ok: false, try a different approach instead of giving up. The graph is authoritative — if it says no edge exists, no edge exists.`;

// Process-level cache of (apiKey hash → { agentId, envId }) so we
// don't re-create agents on every request. Keyed by a sha-like prefix
// of the API key, never by the key itself.
const cache = new Map<string, { agentId: string; envId: string }>();

function cacheKey(apiKey: string): string {
  return apiKey.slice(0, 12) + "…" + apiKey.slice(-6);
}

/** Resolve (or create + cache) the agent + environment IDs for this key. */
export async function ensureAgent(apiKey: string): Promise<{
  agentId: string;
  envId: string;
}> {
  const k = cacheKey(apiKey);
  const hit = cache.get(k);
  if (hit) return hit;

  // Env vars override (lets the operator pin a single shared agent).
  const pinnedAgent = process.env.CAUSALIST_AGENT_ID;
  const pinnedEnv = process.env.CAUSALIST_ENV_ID;
  if (pinnedAgent && pinnedEnv) {
    const ids = { agentId: pinnedAgent, envId: pinnedEnv };
    cache.set(k, ids);
    return ids;
  }

  const client = new Anthropic({ apiKey });

  // 1) Create the environment. Cloud + open networking so future
  //    server-side tools (HTTP fetches against GitHub etc.) can run.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = await (client.beta.environments as any).create({
    name: ENV_NAME,
    config: { type: "cloud", networking: { type: "unrestricted" } },
  });

  // 2) Create the agent with our 10 graph-query tools declared as
  //    custom tools. The SDK's tool schemas use the same {name,
  //    description, input_schema} shape as messages.create, just
  //    flagged with type: "custom".
  const tools = TOOL_SCHEMAS.map((t) => ({
    type: "custom" as const,
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agent = await (client.beta.agents as any).create({
    name: AGENT_NAME,
    model: DEFAULT_MODEL,
    system: SYSTEM_PROMPT,
    tools,
  });

  const ids = { agentId: agent.id, envId: env.id };
  cache.set(k, ids);
  return ids;
}

export type ManagedEvent =
  | { type: "session_started"; sessionId: string }
  | { type: "thinking" }
  | { type: "text"; delta: string }
  | { type: "tool_use"; name: string; input: unknown }
  | { type: "tool_result"; name: string; ok: boolean; summary?: string }
  | { type: "done"; text: string }
  | { type: "error"; message: string };

interface RunArgs {
  apiKey: string;
  graph: CausalGraph;
  question: string;
  /** Optional context (e.g. "User has selected nodes: [...]") */
  context?: string;
  signal?: AbortSignal;
}

/**
 * Stream a Managed Agents Q&A run. Yields normalized events the UI
 * can consume directly. Tool calls execute synchronously in-process
 * against the loaded graph; results stream back to the agent over the
 * same session events channel.
 */
export async function* runManaged(
  args: RunArgs,
): AsyncGenerator<ManagedEvent, void, void> {
  let agentId: string;
  let envId: string;
  try {
    const ids = await ensureAgent(args.apiKey);
    agentId = ids.agentId;
    envId = ids.envId;
  } catch (e) {
    yield {
      type: "error",
      message: `Failed to provision Managed Agent: ${errString(e)}`,
    };
    return;
  }

  const client = new Anthropic({ apiKey: args.apiKey });

  let session: { id: string };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session = await (client.beta.sessions as any).create({
      agent: agentId,
      environment_id: envId,
      title: args.question.slice(0, 80),
    });
  } catch (e) {
    yield {
      type: "error",
      message: `Could not start session: ${errString(e)}`,
    };
    return;
  }

  yield { type: "session_started", sessionId: session.id };

  // Open the event stream BEFORE sending the user message so we don't
  // race past early events. The SDK exposes an async iterable that
  // yields { type, ... } SSE-style events.
  let stream: AsyncIterable<{
    type?: string;
    [k: string]: unknown;
  }>;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stream = await (client.beta.sessions.events as any).stream(session.id);
  } catch (e) {
    yield {
      type: "error",
      message: `Could not open event stream: ${errString(e)}`,
    };
    return;
  }

  // Send the question + context as a single user.message.
  const prompt = args.context
    ? `${args.context}\n\n---\n\n${args.question}`
    : args.question;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.beta.sessions.events as any).send(session.id, {
      events: [
        {
          type: "user.message",
          content: [{ type: "text", text: prompt }],
        },
      ],
    });
  } catch (e) {
    yield {
      type: "error",
      message: `Could not send user message: ${errString(e)}`,
    };
    return;
  }

  let collectedText = "";

  for await (const ev of stream) {
    if (args.signal?.aborted) {
      yield { type: "error", message: "cancelled" };
      return;
    }
    const t = (ev as { type?: string }).type ?? "";

    // Text from the agent — stream deltas.
    if (t === "agent.message" || t === "agent.message_delta") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = (ev as any).content;
      const delta = extractText(content);
      if (delta) {
        collectedText += delta;
        yield { type: "text", delta };
      }
      continue;
    }

    if (t === "agent.thinking" || t === "agent.thinking_delta") {
      yield { type: "thinking" };
      continue;
    }

    // Tool call — run it locally and reply with the result.
    if (t === "agent.custom_tool_use") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = ev as any;
      const name = (e.name ?? e.tool_name) as string;
      const input = e.input ?? {};
      const toolUseId = (e.id ?? e.tool_use_id) as string;
      yield { type: "tool_use", name, input };

      const result = runTool(args.graph, name, input);
      yield {
        type: "tool_result",
        name,
        ok: result.ok,
        summary: result.summary,
      };

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client.beta.sessions.events as any).send(session.id, {
          events: [
            {
              type: "user.custom_tool_result",
              tool_use_id: toolUseId,
              content: [
                { type: "text", text: JSON.stringify(result).slice(0, 16000) },
              ],
            },
          ],
        });
      } catch (e) {
        yield {
          type: "error",
          message: `Failed to send tool result: ${errString(e)}`,
        };
        return;
      }
      continue;
    }

    // Terminal states.
    if (t === "session.status_idle") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stop = (ev as any).stop_reason as string | undefined;
      if (
        stop === "end_turn" ||
        stop === "stop_sequence" ||
        stop === "max_tokens"
      ) {
        yield { type: "done", text: collectedText };
        return;
      }
      // Any other idle state means the agent is waiting on us — keep
      // looping (we already sent any pending tool results above).
      continue;
    }
    if (t === "session.status_terminated" || t === "session.status_failed") {
      yield { type: "done", text: collectedText };
      return;
    }
  }

  // Stream ended without an explicit terminal event.
  yield { type: "done", text: collectedText };
}

/**
 * Extract a text delta from an SDK event's `content` field. The shape
 * varies between SDK versions: sometimes a string, sometimes an array
 * of {type, text} parts. Be liberal in what we accept.
 */
function extractText(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    let out = "";
    for (const part of content) {
      if (typeof part === "string") out += part;
      else if (part && typeof part === "object" && "text" in part) {
        const t = (part as { text?: unknown }).text;
        if (typeof t === "string") out += t;
      }
    }
    return out;
  }
  return "";
}

function errString(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
