// Four-agent analyze pipeline. Four independent `query()` calls run in
// parallel against Claude Opus 4.7 via the Anthropic SDK — the same
// pattern the research recommended as Pattern B (simpler to stream
// back to the UI than orchestrator + subagents).
//
// This module is Node-runtime — it runs from a Next.js Route Handler,
// NEVER from the browser (keys would leak). Browser surfaces call
// `askOracle` in ./index.ts which uses dangerouslyAllowBrowser = true
// explicitly and only for user-owned keys.

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
} from "./prompts";

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
  /** Optional subset of files with source content. Keep total payload <100KB. */
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
  status: "started" | "completed" | "error";
  /** When completed, the partial output so far (nodes, edges, summaries, or final graph). */
  payload?: unknown;
  message?: string;
}

export async function* runAnalyze(
  input: AnalyzeInput,
): AsyncGenerator<AgentEvent, CausalGraph, void> {
  const client = new Anthropic({ apiKey: input.apiKey });

  // Structure + Dependency + Semantic all depend only on the tree/files,
  // so they can run in parallel.
  yield { stage: "structure", status: "started" };
  yield { stage: "dependency", status: "started" };
  yield { stage: "semantic", status: "started" };

  const [nodes, edgesRaw, summariesRaw] = await Promise.all([
    runStructure(client, input),
    runDependency(client, input),
    runSemantic(client, input),
  ]);

  yield { stage: "structure", status: "completed", payload: nodes };
  yield { stage: "dependency", status: "completed", payload: edgesRaw };
  yield { stage: "semantic", status: "completed", payload: summariesRaw };

  // Validate-and-drop orphan edges before Oracle sees them
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = edgesRaw.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  );
  const summaries = summariesRaw.filter((s) => nodeIds.has(s.id));

  yield { stage: "oracle", status: "started" };
  const graph = await runOracle(client, input, nodes, edges, summaries);
  yield { stage: "oracle", status: "completed", payload: graph };
  yield { stage: "done", status: "completed", payload: graph };
  return graph;
}

/** Minimal heuristic node-only scan as a FALLBACK if Claude errors out. */
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

async function runStructure(
  client: Anthropic,
  input: AnalyzeInput,
): Promise<CausalNode[]> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: STRUCTURE_PROMPT,
    messages: [
      {
        role: "user",
        content: `Repository: ${input.owner}/${input.repo}\nCommit: ${input.commit}\n\nFile tree (JSON):\n\`\`\`json\n${JSON.stringify(input.tree)}\n\`\`\``,
      },
    ],
  });
  return parseJsonArray<CausalNode>(response);
}

async function runDependency(
  client: Anthropic,
  input: AnalyzeInput,
): Promise<CausalEdge[]> {
  if (!input.files || input.files.length === 0) {
    // Without file content we can't reliably extract edges; caller should
    // pass a curated subset. Return empty so Oracle can still produce
    // structure-only output.
    return [];
  }
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: DEPENDENCY_PROMPT,
    messages: [
      {
        role: "user",
        content: `Repository: ${input.owner}/${input.repo}\n\nSource files:\n\`\`\`json\n${JSON.stringify(input.files)}\n\`\`\``,
      },
    ],
  });
  return parseJsonArray<CausalEdge>(response);
}

async function runSemantic(
  client: Anthropic,
  input: AnalyzeInput,
): Promise<{ id: string; summary: string }[]> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SEMANTIC_PROMPT,
    messages: [
      {
        role: "user",
        content: `Repository: ${input.owner}/${input.repo}\n\nNodes to summarize:\n\`\`\`json\n${JSON.stringify(input.tree.filter((t) => t.type === "file"))}\n\`\`\`${
          input.files
            ? `\n\nFile contents (for context):\n\`\`\`json\n${JSON.stringify(input.files)}\n\`\`\``
            : ""
        }`,
      },
    ],
  });
  return parseJsonArray<{ id: string; summary: string }>(response);
}

async function runOracle(
  client: Anthropic,
  input: AnalyzeInput,
  nodes: CausalNode[],
  edges: CausalEdge[],
  summaries: { id: string; summary: string }[],
): Promise<CausalGraph> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16384,
    system: ORACLE_PROMPT,
    messages: [
      {
        role: "user",
        content: `Repository: ${input.owner}/${input.repo}\nCommit: ${input.commit}\n\nInputs:\n\n\`\`\`json\n${JSON.stringify(
          { nodes, edges, summaries },
          null,
          2,
        )}\n\`\`\``,
      },
    ],
  });
  const raw = parseJsonObject<CausalGraph>(response);
  return {
    ...raw,
    repo: `${input.owner}/${input.repo}`,
    rootLabel: raw.rootLabel ?? input.repo,
    commit: input.commit,
  };
}

// ───────── parsing helpers ─────────

function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function stripCodeFence(s: string): string {
  const fence = s.match(/```(?:json)?\n?([\s\S]+?)\n?```/);
  return fence ? fence[1].trim() : s.trim();
}

function parseJsonArray<T>(response: Anthropic.Message): T[] {
  const text = stripCodeFence(extractText(response));
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject<T>(response: Anthropic.Message): T {
  const text = stripCodeFence(extractText(response));
  return JSON.parse(text) as T;
}
