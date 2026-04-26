// Four-agent analyze pipeline. Uses the plain @anthropic-ai/sdk with
// `client.messages.stream()` so it works on Vercel serverless without
// needing the Claude Code CLI binary that claude-agent-sdk spawns.
//
// Structure + Dependency + Semantic run in parallel. Each agent emits
// JSONL — one node/edge/summary per line — which the pipeline parses
// incrementally and yields as `emit_node` / `emit_edge` / `emit_summary`
// AgentEvents. The LiveBuildView consumes those events to grow the
// force graph in real time. Oracle synthesizes after the three settle
// and emits a single canonical JSON graph.
//
// Per-agent model assignment is supported via the `models` field on
// AnalyzeInput. Defaults to `claude-opus-4-7` for everyone.

import Anthropic from "@anthropic-ai/sdk";
import type {
  CausalEdge,
  CausalGraph,
  CausalNode,
} from "@/lib/graph/types";
import {
  DEPENDENCY_PROMPT,
  SEMANTIC_PROMPT,
  STRUCTURE_PROMPT,
  ORACLE_PROMPT,
  type BuilderAgentId,
} from "./prompts";
import { verifyGraphEdges } from "./ast-verify";

const DEFAULT_MODEL = "claude-opus-4-7";

export interface TreeEntry {
  path: string;
  size?: number;
  type: "file" | "dir";
}

export type ModelMap = Partial<Record<BuilderAgentId, string>>;

export interface AnalyzeInput {
  owner: string;
  repo: string;
  commit: string;
  tree: TreeEntry[];
  /** Curated subset of files with source content (≤25 files, ≤30KB each). */
  files?: { path: string; content: string }[];
  /** User's Anthropic key — never persisted server-side. */
  apiKey: string;
  /** Per-agent model overrides; defaults to Opus 4.7 for missing entries. */
  models?: ModelMap;
}

export type AgentStage =
  | "structure"
  | "dependency"
  | "semantic"
  | "oracle"
  | "done";

export type AgentStatus =
  | "started"
  | "completed"
  | "error"
  | "thinking"
  | "tool_use"
  | "emit_node"
  | "emit_edge"
  | "emit_summary"
  | "progress";

export interface AgentEvent {
  stage: AgentStage;
  status: AgentStatus;
  /** Final payload on completed; single emitted item on emit_*; count on progress. */
  payload?: unknown;
  message?: string;
}

/** Preflight: verify the API key works before opening the SSE stream. */
export async function preflightKey(apiKey: string): Promise<{
  ok: boolean;
  status?: number;
  error?: string;
}> {
  if (!apiKey) return { ok: false, error: "missing Anthropic key" };
  try {
    const probe = new Anthropic({ apiKey });
    await probe.models.retrieve(DEFAULT_MODEL);
    return { ok: true };
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return { ok: false, status: err.status, error: err.message ?? "auth failed" };
  }
}

export async function* runAnalyze(
  input: AnalyzeInput,
): AsyncGenerator<AgentEvent, CausalGraph, void> {
  // Producer/consumer queue — three agents stream concurrently and
  // funnel emit events into a single ordered yield.
  const queue: AgentEvent[] = [];
  let waiter: (() => void) | null = null;
  const wake = () => {
    const w = waiter;
    waiter = null;
    w?.();
  };
  const enqueue = (ev: AgentEvent) => {
    queue.push(ev);
    wake();
  };

  const client = new Anthropic({ apiKey: input.apiKey });

  // Collected outputs from the three parallel agents.
  let collectedNodes: CausalNode[] = [];
  let collectedEdges: CausalEdge[] = [];
  let collectedSummaries: { id: string; summary: string }[] = [];

  let producersDone = false;
  let oracleGraph: CausalGraph | null = null;

  // Run all three builders concurrently. Each emits JSONL; the
  // line-handler parses each line, pushes to its collector, and
  // enqueues an emit event.
  const runners = (async () => {
    enqueue({ stage: "structure", status: "started" });
    enqueue({ stage: "dependency", status: "started" });
    enqueue({ stage: "semantic", status: "started" });

    const [structureRes, dependencyRes, semanticRes] = await Promise.allSettled([
      streamStructure(client, input, enqueue, (n) => collectedNodes.push(n)),
      streamDependency(client, input, enqueue, (e) => collectedEdges.push(e)),
      streamSemantic(client, input, enqueue, (s) => collectedSummaries.push(s)),
    ]);

    if (structureRes.status === "rejected") {
      enqueue({
        stage: "structure",
        status: "error",
        message: errString(structureRes.reason),
      });
      // Heuristic fallback so the run can continue.
      collectedNodes = heuristicNodes(input.tree);
    }
    enqueue({
      stage: "structure",
      status: "completed",
      payload: collectedNodes,
    });

    if (dependencyRes.status === "rejected") {
      enqueue({
        stage: "dependency",
        status: "error",
        message: errString(dependencyRes.reason),
      });
    }
    enqueue({
      stage: "dependency",
      status: "completed",
      payload: collectedEdges,
    });

    if (semanticRes.status === "rejected") {
      enqueue({
        stage: "semantic",
        status: "error",
        message: errString(semanticRes.reason),
      });
    }
    enqueue({
      stage: "semantic",
      status: "completed",
      payload: collectedSummaries,
    });

    // Drop orphan edges / summaries before Oracle.
    const nodeIds = new Set(collectedNodes.map((n) => n.id));
    const cleanEdges = collectedEdges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
    );
    const cleanSummaries = collectedSummaries.filter((s) => nodeIds.has(s.id));

    enqueue({ stage: "oracle", status: "started" });
    try {
      oracleGraph = await runOracle(
        client,
        input,
        collectedNodes,
        cleanEdges,
        cleanSummaries,
      );
    } catch (e) {
      // Local synthesis fallback so the demo path never dies on Oracle.
      oracleGraph = {
        repo: `${input.owner}/${input.repo}`,
        commit: input.commit,
        rootLabel: input.repo,
        nodes: collectedNodes.map((n) => ({
          ...n,
          summary:
            cleanSummaries.find((s) => s.id === n.id)?.summary ?? n.summary,
        })),
        edges: cleanEdges,
      };
      enqueue({
        stage: "oracle",
        status: "error",
        message: `Oracle fell back to local synthesis: ${errString(e)}`,
      });
    }
    const stats = verifyGraphEdges(oracleGraph, input.files);
    enqueue({
      stage: "oracle",
      status: "completed",
      payload: oracleGraph,
      message: `${stats.verified}/${stats.total} edges AST-verified`,
    });
    enqueue({ stage: "done", status: "completed", payload: oracleGraph });
  })().finally(() => {
    producersDone = true;
    wake();
  });

  while (true) {
    if (queue.length > 0) {
      yield queue.shift()!;
      continue;
    }
    if (producersDone) break;
    await new Promise<void>((resolve) => {
      waiter = resolve;
    });
  }

  await runners;
  if (!oracleGraph) {
    throw new Error("analyze pipeline ended without an Oracle graph");
  }
  return oracleGraph;
}

// ───────── per-agent streamers ─────────

async function streamStructure(
  client: Anthropic,
  input: AnalyzeInput,
  enqueue: (ev: AgentEvent) => void,
  collect: (n: CausalNode) => void,
): Promise<void> {
  const userPrompt = `Repository: ${input.owner}/${input.repo}\nCommit: ${input.commit}\n\nFile tree (JSON array of {path,size,type}):\n${JSON.stringify(
    input.tree,
  )}\n\nEmit one JSON line per node, then {"type":"end"}.`;

  let count = 0;
  await streamJsonlAgent({
    client,
    apiKey: input.apiKey,
    model: input.models?.structure ?? DEFAULT_MODEL,
    system: STRUCTURE_PROMPT,
    user: userPrompt,
    onLine: (obj) => {
      const node = (obj as { node?: CausalNode }).node;
      if (obj.type === "node" && node && typeof node.id === "string") {
        collect(node);
        count++;
        enqueue({ stage: "structure", status: "emit_node", payload: node });
        if (count % 5 === 0) {
          enqueue({ stage: "structure", status: "progress", payload: { count } });
        }
      }
    },
    fallbackArrayKey: "node",
    onFallbackItem: (item) => {
      const n = item as CausalNode;
      if (typeof n?.id !== "string") return;
      collect(n);
      enqueue({ stage: "structure", status: "emit_node", payload: n });
    },
  });
}

async function streamDependency(
  client: Anthropic,
  input: AnalyzeInput,
  enqueue: (ev: AgentEvent) => void,
  collect: (e: CausalEdge) => void,
): Promise<void> {
  if (!input.files || input.files.length === 0) return;
  const userPrompt = `Repository: ${input.owner}/${input.repo}\n\nSource files (JSON):\n${JSON.stringify(
    input.files,
  )}\n\nEmit one JSON line per edge, then {"type":"end"}.`;

  let count = 0;
  await streamJsonlAgent({
    client,
    apiKey: input.apiKey,
    model: input.models?.dependency ?? DEFAULT_MODEL,
    system: DEPENDENCY_PROMPT,
    user: userPrompt,
    onLine: (obj) => {
      const edge = (obj as { edge?: CausalEdge }).edge;
      if (
        obj.type === "edge" &&
        edge &&
        typeof edge.source === "string" &&
        typeof edge.target === "string"
      ) {
        collect(edge);
        count++;
        enqueue({ stage: "dependency", status: "emit_edge", payload: edge });
        if (count % 10 === 0) {
          enqueue({
            stage: "dependency",
            status: "progress",
            payload: { count },
          });
        }
      }
    },
    fallbackArrayKey: "edge",
    onFallbackItem: (item) => {
      const e = item as CausalEdge;
      if (typeof e?.source !== "string" || typeof e?.target !== "string") return;
      collect(e);
      enqueue({ stage: "dependency", status: "emit_edge", payload: e });
    },
  });
}

async function streamSemantic(
  client: Anthropic,
  input: AnalyzeInput,
  enqueue: (ev: AgentEvent) => void,
  collect: (s: { id: string; summary: string }) => void,
): Promise<void> {
  const files = input.tree.filter((t) => t.type === "file");
  const userPrompt = `Repository: ${input.owner}/${input.repo}\n\nNodes to summarize (JSON):\n${JSON.stringify(
    files,
  )}${
    input.files
      ? `\n\nFile contents (for context):\n${JSON.stringify(input.files)}`
      : ""
  }\n\nEmit one JSON line per summary, then {"type":"end"}.`;

  let count = 0;
  await streamJsonlAgent({
    client,
    apiKey: input.apiKey,
    model: input.models?.semantic ?? DEFAULT_MODEL,
    system: SEMANTIC_PROMPT,
    user: userPrompt,
    onLine: (obj) => {
      const summary = (obj as { summary?: { id?: string; summary?: string } })
        .summary;
      if (
        obj.type === "summary" &&
        summary &&
        typeof summary.id === "string" &&
        typeof summary.summary === "string"
      ) {
        const s = summary as { id: string; summary: string };
        collect(s);
        count++;
        enqueue({ stage: "semantic", status: "emit_summary", payload: s });
        if (count % 5 === 0) {
          enqueue({
            stage: "semantic",
            status: "progress",
            payload: { count },
          });
        }
      }
    },
    fallbackArrayKey: "summary",
    onFallbackItem: (item) => {
      const s = item as { id: string; summary: string };
      if (typeof s?.id !== "string") return;
      collect(s);
      enqueue({ stage: "semantic", status: "emit_summary", payload: s });
    },
  });
}

async function runOracle(
  client: Anthropic,
  input: AnalyzeInput,
  nodes: CausalNode[],
  edges: CausalEdge[],
  summaries: { id: string; summary: string }[],
): Promise<CausalGraph> {
  const userPrompt = `Repository: ${input.owner}/${input.repo}\nCommit: ${input.commit}\n\nInputs:\n\n${JSON.stringify(
    { nodes, edges, summaries },
    null,
    2,
  )}\n\nReturn a single JSON object { nodes, edges, rootLabel?, commit? }. No prose, no fences.`;

  const text = await streamFullText(client, {
    model: input.models?.oracle ?? DEFAULT_MODEL,
    system: ORACLE_PROMPT,
    user: userPrompt,
    maxTokens: 16384,
  });
  const raw = parseJsonObject<CausalGraph>(text);
  return {
    ...raw,
    repo: `${input.owner}/${input.repo}`,
    rootLabel: raw.rootLabel ?? input.repo,
    commit: input.commit,
  };
}

// ───────── streaming primitives ─────────

interface StreamJsonlArgs {
  client: Anthropic;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  /** Called for every JSON object successfully parsed from a single line. */
  onLine: (obj: { type?: string; [k: string]: unknown }) => void;
  /** Field key under which fallback-array items are nested (e.g. "node"). */
  fallbackArrayKey: string;
  /** Called for each item recovered from the fallback array path. */
  onFallbackItem: (item: unknown) => void;
}

/**
 * Streams a JSONL agent. As text deltas arrive, parses on newline and
 * fires onLine for each successfully-parsed JSON object. After the
 * stream ends, if NO lines parsed, falls back to scanning the full
 * accumulated text for a `[ … ]` JSON array (legacy "return one
 * array" output) and emits items via onFallbackItem.
 */
async function streamJsonlAgent(args: StreamJsonlArgs): Promise<void> {
  const stream = args.client.messages.stream({
    model: args.model,
    max_tokens: 8192,
    system: args.system,
    messages: [{ role: "user", content: args.user }],
  });

  let buffer = "";
  let allText = "";
  let parsedAny = false;

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    // Strip optional trailing comma (some models add it).
    const candidate = trimmed.replace(/,\s*$/, "");
    try {
      const obj = JSON.parse(candidate) as { type?: string };
      args.onLine(obj);
      parsedAny = true;
    } catch {
      // not JSON — discard silently
    }
  };

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      const t = event.delta.text;
      allText += t;
      buffer += t;
      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        handleLine(line);
      }
    }
  }
  if (buffer.trim()) handleLine(buffer);

  // Fallback: model returned an array instead of JSONL.
  if (!parsedAny) {
    const cleaned = stripCodeFence(allText);
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        for (const item of parsed) args.onFallbackItem(item);
      }
    } catch {
      // give up silently — caller's collected list will just be empty
    }
  }
}

/** Plain text-stream helper for Oracle (single JSON blob expected). */
async function streamFullText(
  client: Anthropic,
  args: { model: string; system: string; user: string; maxTokens: number },
): Promise<string> {
  const stream = client.messages.stream({
    model: args.model,
    max_tokens: args.maxTokens,
    system: args.system,
    messages: [{ role: "user", content: args.user }],
  });
  let text = "";
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      text += event.delta.text;
    }
  }
  if (!text.trim()) throw new Error("agent produced no text output");
  return text;
}

// ───────── helpers ─────────

function errString(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function stripCodeFence(s: string): string {
  const fence = s.match(/```(?:json)?\n?([\s\S]+?)\n?```/);
  return fence ? fence[1].trim() : s.trim();
}

function parseJsonObject<T>(text: string): T {
  return JSON.parse(stripCodeFence(text)) as T;
}

/** Minimal heuristic node-only scan as a FALLBACK if Structure errors. */
export function heuristicNodes(tree: TreeEntry[]): CausalNode[] {
  return tree
    .filter((t) => t.type === "file")
    .map((t) => {
      const ext = t.path.split(".").pop()?.toLowerCase() ?? "";
      const path = t.path;
      let layer: CausalNode["layer"] = "logic";
      if (/__tests__|\.test\.|\.spec\./.test(path) || path.startsWith("test"))
        layer = "test";
      else if (/\.(css|tsx|jsx|vue|svelte|html)$/.test(path)) layer = "ui";
      else if (/\.(json|toml|yaml|yml)$/.test(path) || /^\./.test(path))
        layer = "config";
      else if (/^api\/|\/routes\//.test(path)) layer = "api";
      return {
        id: path.replaceAll("/", "__"),
        label: path.split("/").pop() ?? path,
        path,
        language: ext || undefined,
        kind: "file",
        layer,
      };
    });
}
