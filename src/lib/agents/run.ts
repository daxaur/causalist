// Agent runner — uses the plain Anthropic SDK (HTTP only) instead of
// claude-agent-sdk so it runs on Vercel serverless functions without
// needing the Claude Code CLI binary.
//
// Supports a swarm of N parallel agents, each working the same plan
// from a different "causal lens" (Cause / Effect / Mechanism /
// Intervention / Counterfactual). Events from all agents are
// interleaved into a single async stream, tagged with agentId so the
// UI can attribute findings + paint per-agent activity on the graph.

import Anthropic from "@anthropic-ai/sdk";
import {
  GENERAL_PROMPT,
  CAUSAL_AGENTS,
  buildAgentSystemPrompt,
  buildUserPrompt,
  type AgentRunInput,
  type AgentRunOutput,
  type CausalAgent,
} from "./prompts";

const DEFAULT_MODEL = "claude-opus-4-7";
const MAX_TOKENS = 16_000;
const MAX_AGENTS = CAUSAL_AGENTS.length;

interface AgentMeta {
  agentId: string;
  agentName: string;
  agentColor: string;
}

export type AgentEvent =
  | { type: "started"; nodeCount: number; plan: string; agentCount: number }
  | { type: "file_loaded"; path: string; bytes: number }
  | { type: "thinking" }
  | ({ type: "agent_started"; paths: string[] } & AgentMeta)
  | ({ type: "agent_finished" } & AgentMeta)
  | ({ type: "agent_error"; message: string } & AgentMeta)
  | ({
      type: "finding";
      nodeId: string;
      kind: "reviewed" | "risky" | "fixed";
      note: string;
      path: string;
    } & Partial<AgentMeta>)
  | ({
      type: "patch";
      path: string;
      summary: string;
      bytes: number;
    } & Partial<AgentMeta>)
  | { type: "summary"; text: string }
  | { type: "done"; output: AgentRunOutput }
  | { type: "error"; message: string };

export interface RunOptions {
  apiKey: string;
  /** Free-form plain-English instruction the user typed. */
  plan: string;
  /** Optional model override; defaults to Opus 4.7. */
  model?: string;
  /** Number of parallel agents (1..MAX_AGENTS). Defaults to 1. */
  agents?: number;
  repo: string; // "owner/name"
  branch: string;
  selectedNodeIds: string[];
  /** Map of nodeId -> { path } so the runner can fetch real source. */
  nodePathMap: Record<string, string>;
  /** GitHub access token for fetching file contents. */
  githubToken?: string;
  signal?: AbortSignal;
}

export async function* runAgent(
  opts: RunOptions,
): AsyncGenerator<AgentEvent, AgentRunOutput | null, void> {
  const {
    plan,
    selectedNodeIds,
    nodePathMap,
    repo,
    branch,
    githubToken,
  } = opts;
  const agentCount = clampAgents(opts.agents ?? 1);
  yield {
    type: "started",
    nodeCount: selectedNodeIds.length,
    plan,
    agentCount,
  };

  // Resolve node ids -> file paths, then fetch the file contents from GitHub.
  const pathByNode = new Map<string, string>();
  for (const id of selectedNodeIds) {
    const p = nodePathMap[id];
    if (typeof p === "string" && p.length > 0) pathByNode.set(id, p);
  }
  const paths = Array.from(new Set(pathByNode.values()));

  const files: { nodeId?: string; path: string; content: string }[] = [];
  const failedPaths: string[] = [];
  for (const path of paths) {
    if (opts.signal?.aborted) {
      yield { type: "error", message: "cancelled" };
      return null;
    }
    try {
      const content = await fetchFile(repo, branch, path, githubToken);
      const nodeId = [...pathByNode.entries()].find(([, p]) => p === path)?.[0];
      files.push({ nodeId, path, content });
      yield { type: "file_loaded", path, bytes: content.length };
    } catch (e) {
      // Per-file fetch failure (404, rate-limit, etc.) is NOT fatal —
      // the file may have moved, been renamed in this branch, or the
      // node may not map to a real path (preview graphs). Skip it
      // silently and proceed with the files we did load. Only the
      // empty-result check below decides if the run is dead.
      void e;
      failedPaths.push(path);
    }
  }
  // If some files failed but others loaded, that's fine — surface a
  // soft note via the summary at the end, but don't abort.

  if (files.length === 0) {
    yield {
      type: "error",
      message:
        "Could not load any files. The selected nodes may not map to real paths in this repo (preview/reference graphs run in demo mode).",
    };
    return null;
  }

  yield { type: "thinking" };

  const baseInput: AgentRunInput = {
    plan,
    repo,
    branch,
    files,
    selectedNodeIds,
  };

  const client = new Anthropic({ apiKey: opts.apiKey });

  // Single-agent fast path stays simple.
  if (agentCount === 1) {
    const text = await runOneAgent({
      client,
      model: opts.model ?? DEFAULT_MODEL,
      system: GENERAL_PROMPT,
      input: baseInput,
      signal: opts.signal,
    });
    if (!text) {
      yield { type: "error", message: "agent produced no output" };
      return null;
    }
    const parsed = parseAgentJson(text);
    if (!parsed) {
      yield { type: "error", message: "could not parse agent JSON output" };
      return null;
    }
    yield* emitParsed(parsed);
    yield { type: "done", output: parsed };
    return parsed;
  }

  // Multi-agent: run N parallel streams, interleave events.
  const swarm = CAUSAL_AGENTS.slice(0, agentCount);
  const queue: AgentEvent[] = [];
  let waiter: (() => void) | null = null;
  let producersDone = false;
  const wake = () => {
    const w = waiter;
    waiter = null;
    w?.();
  };
  const enqueue = (ev: AgentEvent) => {
    queue.push(ev);
    wake();
  };

  // Round-robin "ownership" attribution — each file announces which
  // agent is currently looking at it, just for graph-side activity.
  // All agents still see all files in the prompt; the assignment is
  // purely a presentation layer over a uniform input.
  const byAgent = new Map<string, string[]>();
  swarm.forEach((a, i) => {
    const ownedPaths = files
      .filter((_, idx) => idx % swarm.length === i)
      .map((f) => f.path);
    byAgent.set(a.id, ownedPaths);
  });

  const collected: AgentRunOutput = { findings: [], patches: [], summary: "" };
  const summaries: string[] = [];

  const runOne = async (agent: CausalAgent) => {
    const meta: AgentMeta = {
      agentId: agent.id,
      agentName: agent.name,
      agentColor: agent.color,
    };
    enqueue({
      type: "agent_started",
      paths: byAgent.get(agent.id) ?? [],
      ...meta,
    });
    try {
      const text = await runOneAgent({
        client,
        model: opts.model ?? DEFAULT_MODEL,
        system: buildAgentSystemPrompt(agent),
        input: baseInput,
        signal: opts.signal,
      });
      if (!text) {
        enqueue({ type: "agent_error", message: "no output", ...meta });
        return;
      }
      const parsed = parseAgentJson(text);
      if (!parsed) {
        enqueue({
          type: "agent_error",
          message: "could not parse JSON envelope",
          ...meta,
        });
        return;
      }
      for (const f of parsed.findings) {
        collected.findings.push(f);
        enqueue({ type: "finding", ...f, ...meta });
      }
      for (const p of parsed.patches) {
        collected.patches.push(p);
        enqueue({
          type: "patch",
          path: p.path,
          summary: p.summary,
          bytes: p.newContent.length,
          ...meta,
        });
      }
      if (parsed.summary) summaries.push(`**${agent.name}** — ${parsed.summary}`);
      enqueue({ type: "agent_finished", ...meta });
    } catch (e) {
      enqueue({ type: "agent_error", message: errString(e), ...meta });
    }
  };

  // Kick off all agents; flip producersDone when they all settle.
  Promise.allSettled(swarm.map(runOne)).then(() => {
    producersDone = true;
    wake();
  });

  while (true) {
    if (queue.length > 0) {
      const ev = queue.shift()!;
      yield ev;
      continue;
    }
    if (producersDone) break;
    if (opts.signal?.aborted) {
      yield { type: "error", message: "cancelled" };
      return null;
    }
    await new Promise<void>((resolve) => {
      waiter = resolve;
    });
  }

  // Dedupe patches by path (last-write-wins — Intervention agent
  // typically lands the canonical patch). Findings stay attributed.
  const patchesByPath = new Map<string, AgentRunOutput["patches"][number]>();
  for (const p of collected.patches) patchesByPath.set(p.path, p);
  collected.patches = Array.from(patchesByPath.values());
  collected.summary = summaries.join("\n\n");

  if (collected.summary) {
    yield { type: "summary", text: collected.summary };
  }
  yield { type: "done", output: collected };
  return collected;
}

function* emitParsed(parsed: AgentRunOutput): Generator<AgentEvent> {
  for (const f of parsed.findings) {
    yield { type: "finding", ...f };
  }
  for (const p of parsed.patches) {
    yield {
      type: "patch",
      path: p.path,
      summary: p.summary,
      bytes: p.newContent.length,
    };
  }
  if (parsed.summary) yield { type: "summary", text: parsed.summary };
}

interface OneAgentArgs {
  client: Anthropic;
  model: string;
  system: string;
  input: AgentRunInput;
  signal?: AbortSignal;
}

async function runOneAgent(args: OneAgentArgs): Promise<string> {
  const stream = args.client.messages.stream(
    {
      model: args.model,
      max_tokens: MAX_TOKENS,
      system: args.system,
      messages: [{ role: "user", content: buildUserPrompt(args.input) }],
    },
    { signal: args.signal },
  );
  let text = "";
  for await (const event of stream) {
    if (args.signal?.aborted) break;
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      text += event.delta.text;
    }
  }
  return text;
}

function clampAgents(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_AGENTS, Math.floor(n));
}

async function fetchFile(
  repo: string,
  branch: string,
  path: string,
  token?: string,
): Promise<string> {
  const url = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw",
    "User-Agent": "causalist-agents",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub ${res.status}`);
  }
  return res.text();
}

function parseAgentJson(text: string): AgentRunOutput | null {
  const cleaned = stripCodeFence(text);
  try {
    const parsed = JSON.parse(cleaned) as Partial<AgentRunOutput>;
    return normalize(parsed);
  } catch {
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!objMatch) return null;
    try {
      const parsed = JSON.parse(objMatch[0]) as Partial<AgentRunOutput>;
      return normalize(parsed);
    } catch {
      return null;
    }
  }
}

function normalize(p: Partial<AgentRunOutput>): AgentRunOutput {
  return {
    findings: Array.isArray(p.findings) ? p.findings : [],
    patches: Array.isArray(p.patches) ? p.patches : [],
    summary: typeof p.summary === "string" ? p.summary : "",
  };
}

function stripCodeFence(s: string): string {
  const fence = s.match(/```(?:json)?\n?([\s\S]+?)\n?```/);
  return fence ? fence[1].trim() : s.trim();
}

function errString(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
