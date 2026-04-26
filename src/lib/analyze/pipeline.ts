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

  // Sequenced pipeline: Structure first (so Dep + Sem know what node
  // IDs exist), then Dependency + Semantic in parallel against that
  // node list. This is also the better demo: nodes appear first as the
  // file tree, then edges trace between them — the live force graph
  // visibly grows in two phases.
  const runners = (async () => {
    enqueue({ stage: "structure", status: "started" });
    let structureErr: unknown = null;
    try {
      await streamStructure(client, input, enqueue, (n) =>
        collectedNodes.push(n),
      );
    } catch (e) {
      structureErr = e;
    }
    if (structureErr) {
      enqueue({
        stage: "structure",
        status: "error",
        message: errString(structureErr),
      });
      // Heuristic fallback so the run can continue.
      collectedNodes = heuristicNodes(input.tree);
    }
    enqueue({
      stage: "structure",
      status: "completed",
      payload: collectedNodes,
    });

    // Now Dependency + Semantic — both informed by the real node list.
    enqueue({ stage: "dependency", status: "started" });
    enqueue({ stage: "semantic", status: "started" });
    const [dependencyRes, semanticRes] = await Promise.allSettled([
      streamDependency(client, input, collectedNodes, enqueue, (e) =>
        collectedEdges.push(e),
      ),
      streamSemantic(client, input, collectedNodes, enqueue, (s) =>
        collectedSummaries.push(s),
      ),
    ]);

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

    // Resolve edge endpoints to canonical node IDs (handles cases
    // where the model emits the path or a relative variant), then drop
    // anything that still doesn't map to a real node.
    const cleanEdges = resolveEdges(collectedEdges, collectedNodes);
    const summariesById = new Set(collectedNodes.map((n) => n.id));
    const cleanSummaries = collectedSummaries.filter((s) =>
      summariesById.has(s.id),
    );

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
  nodes: CausalNode[],
  enqueue: (ev: AgentEvent) => void,
  collect: (e: CausalEdge) => void,
): Promise<void> {
  if (!input.files || input.files.length === 0) return;
  // Compact node manifest: just id + path + layer. Source/target on
  // emitted edges MUST be one of these `id` values verbatim. Without
  // this, Dependency invents IDs the orphan filter then drops.
  const nodeManifest = nodes.map((n) => ({
    id: n.id,
    path: n.path,
    layer: n.layer,
  }));
  const userPrompt = `Repository: ${input.owner}/${input.repo}\n\n## Node manifest\nThese are the EXACT id strings you must use as edge source/target. Do NOT invent new ids — if a file isn't in the manifest, skip the edge.\n${JSON.stringify(
    nodeManifest,
  )}\n\n## Source files\n${JSON.stringify(
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
  nodes: CausalNode[],
  enqueue: (ev: AgentEvent) => void,
  collect: (s: { id: string; summary: string }) => void,
): Promise<void> {
  // Pass Structure's node manifest so summaries key off the same `id`
  // values the rest of the pipeline expects.
  const nodeManifest = nodes.map((n) => ({ id: n.id, path: n.path }));
  const userPrompt = `Repository: ${input.owner}/${input.repo}\n\n## Nodes to summarize\nUse the EXACT id strings from this manifest as the \`id\` on each emitted summary.\n${JSON.stringify(
    nodeManifest,
  )}${
    input.files
      ? `\n\n## File contents (for context)\n${JSON.stringify(input.files)}`
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

/**
 * Map model-emitted edge endpoints back to canonical node IDs. Even
 * with a node manifest in the prompt, models occasionally emit the
 * `path` instead of the `id`, or a path with leading "./" / "../",
 * or a slashed variant of the underscore id. This resolver tries each
 * shape; only edges where BOTH ends resolve survive.
 */
function resolveEdges(
  edges: CausalEdge[],
  nodes: CausalNode[],
): CausalEdge[] {
  const byId = new Map(nodes.map((n) => [n.id, n.id]));
  const byPath = new Map(nodes.map((n) => [n.path, n.id]));
  const bySlashedId = new Map(
    nodes.map((n) => [n.id.replaceAll("__", "/"), n.id]),
  );

  const resolve = (raw: string): string | null => {
    if (byId.has(raw)) return byId.get(raw)!;
    if (byPath.has(raw)) return byPath.get(raw)!;
    if (bySlashedId.has(raw)) return bySlashedId.get(raw)!;
    const stripped = raw.replace(/^\.\/?/, "").replace(/\\/g, "/");
    if (byPath.has(stripped)) return byPath.get(stripped)!;
    if (bySlashedId.has(stripped)) return bySlashedId.get(stripped)!;
    return null;
  };

  const out: CausalEdge[] = [];
  const seen = new Set<string>();
  for (const e of edges) {
    const s = resolve(e.source);
    const t = resolve(e.target);
    if (!s || !t || s === t) continue;
    const key = `${s}->${t}|${e.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...e, source: s, target: t });
  }
  return out;
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
