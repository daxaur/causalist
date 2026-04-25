// Real Claude-Agent-SDK runner for the Agents tab. Streams events the
// route can forward via SSE: started, file_loaded, thinking, finding,
// patch, summary, done, error.

import {
  query,
  type Options,
  type SDKMessage,
} from "@anthropic-ai/claude-agent-sdk";
import {
  GENERAL_PROMPT,
  buildUserPrompt,
  type AgentRunInput,
  type AgentRunOutput,
} from "./prompts";

const MODEL = "claude-opus-4-7";

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
  repo: string; // "owner/name"
  branch: string;
  selectedNodeIds: string[];
  /** Map of nodeId -> { path } so the runner can fetch real source. */
  nodePathMap: Record<string, string>;
  /** GitHub access token for fetching file contents (and later for PR push). */
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

  const userPrompt = buildUserPrompt(input);
  const sysPrompt = GENERAL_PROMPT;

  const sdkOpts: Options = {
    env: {
      ...(process.env as Record<string, string>),
      ANTHROPIC_API_KEY: opts.apiKey,
    },
    settingSources: [],
    allowedTools: [],
    systemPrompt: sysPrompt,
    model: MODEL,
    maxTurns: 3,
    permissionMode: "bypassPermissions",
  };

  let finalText = "";
  try {
    const iter = query({ prompt: userPrompt, options: sdkOpts });
    for await (const msg of iter as AsyncGenerator<SDKMessage>) {
      if (opts.signal?.aborted) break;
      if (msg.type === "assistant") {
        const content = msg.message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if ((block as { type?: string }).type === "text") {
              finalText += (block as { text?: string }).text ?? "";
            }
          }
        }
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
  // Strip code fence if present, then attempt to parse the largest
  // top-level JSON object in the text.
  const cleaned = stripCodeFence(text);
  try {
    const parsed = JSON.parse(cleaned) as Partial<AgentRunOutput>;
    return normalize(parsed);
  } catch {
    // last resort: find the first { and matching } via brace scan
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
