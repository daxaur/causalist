// Agent runner — uses the plain Anthropic SDK (HTTP only) instead of
// claude-agent-sdk so it runs on Vercel serverless functions without
// needing the Claude Code CLI binary.

import Anthropic from "@anthropic-ai/sdk";
import {
  GENERAL_PROMPT,
  buildUserPrompt,
  type AgentRunInput,
  type AgentRunOutput,
} from "./prompts";

const DEFAULT_MODEL = "claude-opus-4-7";
const MAX_TOKENS = 16_000;

export type AgentEvent =
  | { type: "started"; nodeCount: number; plan: string }
  | { type: "file_loaded"; path: string; bytes: number }
  | { type: "thinking" }
  | { type: "finding"; nodeId: string; kind: "reviewed" | "risky" | "fixed"; note: string; path: string }
  | { type: "patch"; path: string; summary: string; bytes: number }
  | { type: "summary"; text: string }
  | { type: "done"; output: AgentRunOutput }
  | { type: "error"; message: string };

export interface RunOptions {
  apiKey: string;
  /** Free-form plain-English instruction the user typed. */
  plan: string;
  /** Optional model override; defaults to Opus 4.7. */
  model?: string;
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
  const { plan, selectedNodeIds, nodePathMap, repo, branch, githubToken } = opts;
  yield { type: "started", nodeCount: selectedNodeIds.length, plan };

  // Resolve node ids -> file paths, then fetch the file contents from GitHub.
  const paths = Array.from(
    new Set(
      selectedNodeIds
        .map((id) => nodePathMap[id])
        .filter((p): p is string => typeof p === "string" && p.length > 0),
    ),
  );

  const files: { path: string; content: string }[] = [];
  for (const path of paths) {
    if (opts.signal?.aborted) {
      yield { type: "error", message: "cancelled" };
      return null;
    }
    try {
      const content = await fetchFile(repo, branch, path, githubToken);
      files.push({ path, content });
      yield { type: "file_loaded", path, bytes: content.length };
    } catch (e) {
      yield {
        type: "error",
        message: `failed to read ${path}: ${errString(e)}`,
      };
    }
  }

  if (files.length === 0) {
    yield {
      type: "error",
      message:
        "Could not load any files. The selected nodes may not map to real paths in this repo (preview/reference graphs run in demo mode).",
    };
    return null;
  }

  yield { type: "thinking" };

  const input: AgentRunInput = {
    plan,
    repo,
    branch,
    files,
    selectedNodeIds,
  };

  const client = new Anthropic({ apiKey: opts.apiKey });
  let finalText = "";

  try {
    const stream = client.messages.stream(
      {
        model: opts.model ?? DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: GENERAL_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(input) }],
      },
      { signal: opts.signal },
    );

    // Accumulate text deltas as the model streams.
    for await (const event of stream) {
      if (opts.signal?.aborted) break;
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        finalText += event.delta.text;
      }
    }
  } catch (e) {
    yield { type: "error", message: errString(e) };
    return null;
  }

  if (!finalText.trim()) {
    yield { type: "error", message: "agent produced no output" };
    return null;
  }

  const parsed = parseAgentJson(finalText);
  if (!parsed) {
    yield {
      type: "error",
      message: "could not parse agent JSON output",
    };
    return null;
  }

  // Emit findings + patches as discrete events so the UI can stream them.
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
  if (parsed.summary) {
    yield { type: "summary", text: parsed.summary };
  }

  yield { type: "done", output: parsed };
  return parsed;
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
