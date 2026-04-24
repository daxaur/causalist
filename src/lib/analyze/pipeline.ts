// Four-agent analyze pipeline using the Claude Agent SDK.
//
// Structure + Dependency + Semantic run in parallel (each is an
// isolated `query()` instance of Claude Opus 4.7 — the SDK spawns
// a Claude Code subprocess per call, which gets us retry/backoff,
// structured JSON output, and token/cost telemetry for free).
// Oracle synthesizes after the three complete.
//
// Node-runtime only. The user's Anthropic key is injected per-call
// via `options.env` so concurrent requests on the same lambda don't
// stomp each other's `process.env`.

import Anthropic from "@anthropic-ai/sdk";
import {
  query,
  type Options,
  type SDKMessage,
  type SDKResultMessage,
} from "@anthropic-ai/claude-agent-sdk";
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
} from "./prompts";
import { verifyGraphEdges } from "./ast-verify";

const MODEL = "claude-opus-4-7";

export interface TreeEntry {
  path: string;
  size?: number;
  type: "file" | "dir";
}

export interface AnalyzeInput {
  owner: string;
  repo: string;
  commit: string;
  tree: TreeEntry[];
  /** Curated subset of files with source content (≤25 files, ≤30KB each). */
  files?: { path: string; content: string }[];
  /** User's Anthropic key — never persisted server-side. */
  apiKey: string;
}

export type AgentStage =
  | "structure"
  | "dependency"
  | "semantic"
  | "oracle"
  | "done";

export interface AgentEvent {
  stage: AgentStage;
  status: "started" | "completed" | "error" | "thinking" | "tool_use";
  /** When completed, the partial output so far. */
  payload?: unknown;
  message?: string;
}

/**
 * Preflight — verify the API key works before opening the SSE stream.
 * Without this, the UI only finds out about a bad key minutes later
 * inside the SSE body.
 */
export async function preflightKey(apiKey: string): Promise<{
  ok: boolean;
  status?: number;
  error?: string;
}> {
  if (!apiKey) return { ok: false, error: "missing Anthropic key" };
  try {
    const probe = new Anthropic({ apiKey });
    await probe.models.retrieve("claude-opus-4-7");
    return { ok: true };
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return { ok: false, status: err.status, error: err.message ?? "auth failed" };
  }
}

export async function* runAnalyze(
  input: AnalyzeInput,
): AsyncGenerator<AgentEvent, CausalGraph, void> {
  yield { stage: "structure", status: "started" };
  yield { stage: "dependency", status: "started" };
  yield { stage: "semantic", status: "started" };

  // Use allSettled so a single agent error doesn't kill the whole run.
  const [structureRes, dependencyRes, semanticRes] = await Promise.allSettled([
    runStructure(input),
    runDependency(input),
    runSemantic(input),
  ]);

  const nodes =
    structureRes.status === "fulfilled"
      ? structureRes.value
      : heuristicNodes(input.tree);
  if (structureRes.status === "rejected") {
    yield {
      stage: "structure",
      status: "error",
      message: errString(structureRes.reason),
    };
  }
  yield { stage: "structure", status: "completed", payload: nodes };

  const edgesRaw =
    dependencyRes.status === "fulfilled" ? dependencyRes.value : [];
  if (dependencyRes.status === "rejected") {
    yield {
      stage: "dependency",
      status: "error",
      message: errString(dependencyRes.reason),
    };
  }
  yield { stage: "dependency", status: "completed", payload: edgesRaw };

  const summariesRaw =
    semanticRes.status === "fulfilled" ? semanticRes.value : [];
  if (semanticRes.status === "rejected") {
    yield {
      stage: "semantic",
      status: "error",
      message: errString(semanticRes.reason),
    };
  }
  yield { stage: "semantic", status: "completed", payload: summariesRaw };

  // Drop orphan edges / summaries before Oracle sees them
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = edgesRaw.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  );
  const summaries = summariesRaw.filter((s) => nodeIds.has(s.id));

  yield { stage: "oracle", status: "started" };
  let graph: CausalGraph;
  try {
    graph = await runOracle(input, nodes, edges, summaries);
  } catch (e) {
    // Fallback: synthesize a graph locally from the three inputs so the
    // demo path never dies on a single Oracle failure.
    graph = {
      repo: `${input.owner}/${input.repo}`,
      commit: input.commit,
      rootLabel: input.repo,
      nodes: nodes.map((n) => ({
        ...n,
        summary: summaries.find((s) => s.id === n.id)?.summary ?? n.summary,
      })),
      edges,
    };
    yield {
      stage: "oracle",
      status: "error",
      message: `Oracle fell back to local synthesis: ${errString(e)}`,
    };
  }
  // AST-verify every edge against real source. Edges Oracle hallucinated
  // get `verified: false`; edges that line up with imports/requires in
  // the source get `verified: true`. The viewer renders the two classes
  // differently so users (and agents) can trust-gate.
  const stats = verifyGraphEdges(graph, input.files);
  yield {
    stage: "oracle",
    status: "completed",
    payload: graph,
    message: `${stats.verified}/${stats.total} edges AST-verified`,
  };
  yield { stage: "done", status: "completed", payload: graph };
  return graph;
}

// ───────── stage implementations (SDK-backed) ─────────

async function runStructure(input: AnalyzeInput): Promise<CausalNode[]> {
  const prompt = `Repository: ${input.owner}/${input.repo}\nCommit: ${input.commit}\n\nFile tree (JSON):\n\`\`\`json\n${JSON.stringify(
    input.tree,
  )}\n\`\`\`\n\nReturn ONLY a JSON array of CausalNode objects. No prose, no fences.`;
  const text = await runAgent(input.apiKey, STRUCTURE_PROMPT, prompt);
  return parseJsonArray<CausalNode>(text);
}

async function runDependency(input: AnalyzeInput): Promise<CausalEdge[]> {
  if (!input.files || input.files.length === 0) return [];
  const prompt = `Repository: ${input.owner}/${input.repo}\n\nSource files:\n\`\`\`json\n${JSON.stringify(
    input.files,
  )}\n\`\`\`\n\nReturn ONLY a JSON array of CausalEdge objects { source, target, kind }. No prose, no fences.`;
  const text = await runAgent(input.apiKey, DEPENDENCY_PROMPT, prompt);
  return parseJsonArray<CausalEdge>(text);
}

async function runSemantic(
  input: AnalyzeInput,
): Promise<{ id: string; summary: string }[]> {
  const files = input.tree.filter((t) => t.type === "file");
  const prompt = `Repository: ${input.owner}/${input.repo}\n\nNodes to summarize:\n\`\`\`json\n${JSON.stringify(
    files,
  )}\n\`\`\`${
    input.files
      ? `\n\nFile contents (for context):\n\`\`\`json\n${JSON.stringify(input.files)}\n\`\`\``
      : ""
  }\n\nReturn ONLY a JSON array of { id, summary } objects. No prose, no fences.`;
  const text = await runAgent(input.apiKey, SEMANTIC_PROMPT, prompt);
  return parseJsonArray<{ id: string; summary: string }>(text);
}

async function runOracle(
  input: AnalyzeInput,
  nodes: CausalNode[],
  edges: CausalEdge[],
  summaries: { id: string; summary: string }[],
): Promise<CausalGraph> {
  const prompt = `Repository: ${input.owner}/${input.repo}\nCommit: ${input.commit}\n\nInputs:\n\n\`\`\`json\n${JSON.stringify(
    { nodes, edges, summaries },
    null,
    2,
  )}\n\`\`\`\n\nReturn ONLY a JSON object { nodes, edges, rootLabel?, commit? }. No prose, no fences.`;
  const text = await runAgent(input.apiKey, ORACLE_PROMPT, prompt, 16384);
  const raw = parseJsonObject<CausalGraph>(text);
  return {
    ...raw,
    repo: `${input.owner}/${input.repo}`,
    rootLabel: raw.rootLabel ?? input.repo,
    commit: input.commit,
  };
}

/**
 * One managed-agent call. Spawns the Claude Code subprocess with a
 * fresh `env` per invocation so concurrent requests don't collide
 * on `process.env`. No Claude Code tools (`tools: []`), no
 * `~/.claude` settings (`settingSources: []`) — we're in isolation
 * mode, just using the SDK's prompt-and-stream plumbing.
 */
async function runAgent(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  _maxTokensHint: number = 8192,
): Promise<string> {
  const options: Options = {
    env: { ...(process.env as Record<string, string>), ANTHROPIC_API_KEY: apiKey },
    settingSources: [],
    allowedTools: [],
    systemPrompt,
    model: MODEL,
    maxTurns: 3,
    permissionMode: "bypassPermissions",
  };

  let finalText = "";
  let result: SDKResultMessage | null = null;
  const iter = query({ prompt: userPrompt, options });
  for await (const msg of iter as AsyncGenerator<SDKMessage>) {
    if (msg.type === "assistant") {
      const content = msg.message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if ((block as { type?: string }).type === "text") {
            finalText += (block as { text?: string }).text ?? "";
          }
        }
      }
    } else if (msg.type === "result") {
      result = msg as SDKResultMessage;
    }
  }

  if (result && "subtype" in result && result.subtype !== "success") {
    const subtype = (result as { subtype?: string }).subtype ?? "error";
    throw new Error(`agent ${subtype}`);
  }
  // If the SDK ran but produced no text (rare), surface that.
  if (!finalText.trim()) {
    throw new Error("agent produced no text output");
  }
  return finalText;
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

function parseJsonArray<T>(text: string): T[] {
  try {
    const parsed = JSON.parse(stripCodeFence(text));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
