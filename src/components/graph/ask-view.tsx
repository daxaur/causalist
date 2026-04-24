"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  CaretDown,
  CaretRight,
  CircleNotch,
  Key,
  MagicWand,
  PaperPlaneRight,
  Sparkle,
  Stop,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings";
import type { CausalGraph, CausalNode } from "@/lib/graph/types";
import { LAYER_COLORS } from "@/lib/graph/types";
import {
  TOOL_SCHEMAS,
  runTool,
  type ToolResult,
} from "@/lib/analyze/tools";

const MODEL = "claude-opus-4-7";

const ORACLE_SYSTEM = `You reason over a **causal graph** of a codebase. Nodes are files/symbols; edges are typed: \`imports\` (structural — A references B's name) or \`calls/reads/writes/extends\` (interventional — A's behavior depends on B's behavior at runtime). Structural edges tell you what the compiler sees; interventional edges tell you what **breaks** when something changes. Prefer interventional reasoning for "what if" or "why."

You have six tools: \`query_node\`, \`get_neighbors\`, \`find_path\`, \`verify_edge\`, \`find_nodes_by_layer\`, \`blast_radius\`. **Use them** — don't answer from memory. Tool use is reasoning, not decoration: each call must close a specific gap you can name ("I need \`session.ts\` to know whether the cookie is signed").

## How to answer

1. Identify the subgraph that could affect the answer. Start from nodes the user named, expand along interventional edges until closure.
2. Call tools to fill specific gaps.
3. Answer in **explicit causal chains**: "Because A delegates auth to B, and because B reads from C, therefore a C outage degrades every route under A."
4. Walk the graph in **topological order** — causes before effects.
5. End with a one-line **blast radius** if relevant: what else changes if this changes.

## Style rules

- Wrap node ids in \`backticks\` so they become clickable chips.
- Every non-trivial claim takes the form "Because ⟨cause⟩, therefore ⟨effect⟩." Chain them.
- Do not hedge with "seems to," "appears to," "likely." Either the graph supports the claim or it doesn't — if it doesn't, name the missing edge you'd need.
- **Teach as you answer.** Include one sentence per response that generalizes a reusable pattern ("this is the standard adapter-over-provider shape; whenever you see X you can expect Y"). Never waste that sentence on filler.
- Keep paragraphs short (2–4 sentences). Plain Markdown, no code fences around the answer.`;

const SUGGESTIONS = [
  "What does this codebase do?",
  "Which files break most if I delete them?",
  "Show me all the API-layer files",
];

// ── Message types ────────────────────────────────────────────────────

type UserMsg = { role: "user"; text: string };
type OracleTurn = {
  role: "oracle";
  content: AssistantBlock[];
  stopReason?: string;
};
type AssistantBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown; result?: ToolResult };

type Message = UserMsg | OracleTurn;

// ── Component ────────────────────────────────────────────────────────

export function AskView({
  graph,
  onHighlightNodes,
}: {
  graph: CausalGraph;
  onHighlightNodes?: (nodeIds: string[]) => void;
}) {
  const settings = useSettings();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [streamingBlocks, setStreamingBlocks] = useState<AssistantBlock[]>([]);
  const [busy, setBusy] = useState<null | "thinking" | "tooling">(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const nodeIds = useMemo(
    () => new Set(graph.nodes.map((n) => n.id)),
    [graph.nodes],
  );
  const nodesById = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n])),
    [graph.nodes],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [history, streamingBlocks]);

  // Highlight cited nodes as they stream in
  useEffect(() => {
    if (!onHighlightNodes) return;
    const text = streamingBlocks
      .filter((b): b is Extract<AssistantBlock, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const ids = extractCitations(text, nodeIds);
    if (ids.length) onHighlightNodes(ids);
  }, [streamingBlocks, nodeIds, onHighlightNodes]);

  const canAsk = Boolean(settings.anthropicKey);

  const submit = async (q: string) => {
    if (!canAsk) return;
    const trimmed = q.trim();
    if (!trimmed) return;

    setHistory((h) => [...h, { role: "user", text: trimmed }]);
    setQuestion("");
    setBusy("thinking");
    setStreamingBlocks([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({
        apiKey: settings.anthropicKey,
        dangerouslyAllowBrowser: true,
      });

      // Build the initial conversation. Send node list (no edges) to
      // keep the prompt light; Oracle pulls edges via tools as needed.
      const nodeSummary = graph.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        layer: n.layer,
        kind: n.kind,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages: any[] = [
        {
          role: "user",
          content: `Graph for ${graph.repo}. ${graph.nodes.length} nodes, ${graph.edges.length} edges.\n\nNode index (id, label, layer, kind):\n\`\`\`json\n${JSON.stringify(nodeSummary)}\n\`\`\`\n\nQuestion: ${trimmed}`,
        },
      ];

      // Tool-use loop — max 8 iterations to bound latency / cost.
      const allBlocks: AssistantBlock[] = [];
      let stopReason: string | undefined;

      for (let iter = 0; iter < 8; iter++) {
        if (controller.signal.aborted) break;

        const turnBlocks: AssistantBlock[] = [];
        setBusy(iter === 0 ? "thinking" : "tooling");

        const stream = await client.messages.stream({
          model: MODEL,
          max_tokens: 2048,
          system: ORACLE_SYSTEM,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: TOOL_SCHEMAS as any,
          messages,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentBlocksForDisplay = (arr: AssistantBlock[]) =>
          setStreamingBlocks([...allBlocks, ...arr]);

        let textAcc = "";
        let textIdx = -1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let toolUseAcc: { id: string; name: string; inputJson: string; idx: number } | null =
          null;

        for await (const event of stream) {
          if (controller.signal.aborted) break;
          if (event.type === "content_block_start") {
            if (event.content_block.type === "text") {
              textAcc = "";
              textIdx = turnBlocks.length;
              turnBlocks.push({ type: "text", text: "" });
            } else if (event.content_block.type === "tool_use") {
              toolUseAcc = {
                id: event.content_block.id,
                name: event.content_block.name,
                inputJson: "",
                idx: turnBlocks.length,
              };
              turnBlocks.push({
                type: "tool_use",
                id: event.content_block.id,
                name: event.content_block.name,
                input: {},
              });
            }
          } else if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta" && textIdx >= 0) {
              textAcc += event.delta.text;
              turnBlocks[textIdx] = { type: "text", text: textAcc };
              currentBlocksForDisplay(turnBlocks);
            } else if (
              event.delta.type === "input_json_delta" &&
              toolUseAcc
            ) {
              toolUseAcc.inputJson += event.delta.partial_json;
            }
          } else if (event.type === "content_block_stop") {
            if (toolUseAcc) {
              let input: unknown = {};
              try {
                input = JSON.parse(toolUseAcc.inputJson || "{}");
              } catch {
                /* leave as {} */
              }
              turnBlocks[toolUseAcc.idx] = {
                type: "tool_use",
                id: toolUseAcc.id,
                name: toolUseAcc.name,
                input,
              };
              toolUseAcc = null;
              currentBlocksForDisplay(turnBlocks);
            }
            textIdx = -1;
          } else if (event.type === "message_delta") {
            if (event.delta.stop_reason)
              stopReason = event.delta.stop_reason;
          }
        }

        // Execute any tool_use blocks
        const toolUses = turnBlocks.filter(
          (b): b is Extract<AssistantBlock, { type: "tool_use" }> =>
            b.type === "tool_use",
        );

        allBlocks.push(...turnBlocks);
        setStreamingBlocks([...allBlocks]);

        if (toolUses.length === 0) break;

        // Run tools locally
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const assistantBlockForApi: any[] = turnBlocks.map((b) =>
          b.type === "text"
            ? { type: "text", text: b.text }
            : { type: "tool_use", id: b.id, name: b.name, input: b.input },
        );
        messages.push({ role: "assistant", content: assistantBlockForApi });

        const toolResults = toolUses.map((t) => {
          const res = runTool(graph, t.name, t.input);
          t.result = res;
          return {
            type: "tool_result",
            tool_use_id: t.id,
            content: JSON.stringify(res),
          };
        });

        setStreamingBlocks([...allBlocks]);
        messages.push({ role: "user", content: toolResults });

        if (stopReason === "end_turn") break;
      }

      setHistory((h) => [
        ...h,
        { role: "oracle", content: allBlocks, stopReason },
      ]);
      setStreamingBlocks([]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setHistory((h) => [
        ...h,
        {
          role: "oracle",
          content: [{ type: "text", text: `⚠ ${msg}` }],
        },
      ]);
      setStreamingBlocks([]);
    } finally {
      setBusy(null);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  if (!canAsk) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-white">
          <Key size={18} weight="duotone" />
        </div>
        <h2 className="mb-2 font-display text-2xl font-medium tracking-tight">
          Ask needs your Anthropic key
        </h2>
        <p className="mb-6 max-w-md text-sm text-neutral-500">
          Oracle navigates the graph with tools; you provide the compute.
          Keys stay in your browser.
        </p>
        <Link
          href="/app/settings"
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-sm text-white transition-colors hover:bg-neutral-800"
        >
          Add your key
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const isStreaming = busy !== null;
  const liveTurn: OracleTurn | null =
    streamingBlocks.length > 0
      ? { role: "oracle", content: streamingBlocks }
      : null;

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-6 pt-6">
      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto pb-4 pr-2">
        {history.length === 0 && !isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="py-10 text-center"
          >
            <Sparkle
              size={22}
              weight="duotone"
              className="mx-auto mb-4 text-[#E838A4]"
            />
            <h2 className="mb-2 font-display text-3xl font-medium tracking-[-0.02em]">
              Oracle has six tools
            </h2>
            <p className="mx-auto mb-7 max-w-md text-sm text-neutral-500">
              Ask anything about{" "}
              <span className="font-mono text-neutral-700">{graph.repo}</span>
              . Oracle calls tools to navigate the graph, then cites the
              exact nodes it found.
            </p>
            <div className="mx-auto flex max-w-lg flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-full border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs text-neutral-600 backdrop-blur-sm transition-all hover:border-neutral-400 hover:text-neutral-900"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {history.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm text-white">
                {msg.text}
              </div>
            </div>
          ) : (
            <OracleTurnView
              key={i}
              turn={msg}
              nodesById={nodesById}
              onNodeClick={(id) => onHighlightNodes?.([id])}
            />
          ),
        )}

        {liveTurn && (
          <OracleTurnView
            turn={liveTurn}
            streaming
            nodesById={nodesById}
            onNodeClick={(id) => onHighlightNodes?.([id])}
          />
        )}

        {isStreaming && liveTurn === null && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <CircleNotch size={12} className="animate-spin" />
            {busy === "thinking" ? "thinking…" : "running tools…"}
          </div>
        )}
      </div>

      {/* Composer — sticky to bottom of the panel */}
      <div className="sticky bottom-0 -mx-6 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-sm">
            <input
              autoFocus
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isStreaming) {
                  e.preventDefault();
                  submit(question);
                }
              }}
              placeholder={
                isStreaming
                  ? busy === "thinking"
                    ? "thinking…"
                    : "running tools…"
                  : "Ask anything about the graph"
              }
              disabled={isStreaming}
              className="w-full bg-transparent px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none disabled:opacity-70"
            />
            {isStreaming ? (
              <button
                onClick={stop}
                aria-label="Stop generation"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 transition-colors hover:text-neutral-900"
              >
                <Stop size={14} weight="fill" />
              </button>
            ) : (
              <button
                onClick={() => submit(question)}
                disabled={!question.trim()}
                aria-label="Ask"
                className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-900 text-white transition-colors hover:bg-neutral-800 disabled:opacity-30"
              >
                <PaperPlaneRight size={13} weight="fill" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Rendering ──────────────────────────────────────────────────────

function OracleTurnView({
  turn,
  streaming,
  nodesById,
  onNodeClick,
}: {
  turn: OracleTurn;
  streaming?: boolean;
  nodesById: Map<string, CausalNode>;
  onNodeClick: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#E838A4]/30 bg-[#fbe8f4]">
        <Sparkle size={11} weight="duotone" className="text-[#E838A4]" />
      </div>
      <div className="flex-1 space-y-3">
        <AnimatePresence initial={false}>
          {turn.content.map((block, i) =>
            block.type === "text" ? (
              <motion.div
                key={`t-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[15px] leading-[1.75] text-neutral-800"
              >
                <RenderWithCitations
                  text={block.text}
                  nodesById={nodesById}
                  onNodeClick={onNodeClick}
                />
                {streaming && i === turn.content.length - 1 && (
                  <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-[#E838A4] align-middle" />
                )}
              </motion.div>
            ) : (
              <ToolCall key={`u-${i}`} block={block} />
            ),
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ToolCall({
  block,
}: {
  block: Extract<AssistantBlock, { type: "tool_use" }>;
}) {
  const [open, setOpen] = useState(false);
  const hasResult = Boolean(block.result);
  const success = block.result?.ok ?? null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50/70"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
      >
        {open ? (
          <CaretDown size={10} className="text-neutral-400" />
        ) : (
          <CaretRight size={10} className="text-neutral-400" />
        )}
        <MagicWand size={11} weight="duotone" className="text-[#E838A4]" />
        <span className="font-mono text-neutral-700">{block.name}</span>
        <span className="truncate font-mono text-[11px] text-neutral-400">
          {formatToolArgs(block.input)}
        </span>
        {hasResult && (
          <span
            className={cn(
              "ml-auto shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
              success
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600",
            )}
          >
            {block.result?.summary ?? (success ? "ok" : "error")}
          </span>
        )}
        {!hasResult && (
          <CircleNotch
            size={10}
            className="ml-auto shrink-0 animate-spin text-neutral-400"
          />
        )}
      </button>
      {open && block.result && (
        <pre className="max-h-64 overflow-auto border-t border-neutral-200 bg-white px-3 py-2 font-mono text-[10.5px] leading-relaxed text-neutral-700">
          {JSON.stringify(block.result.data ?? block.result, null, 2)}
        </pre>
      )}
    </motion.div>
  );
}

function RenderWithCitations({
  text,
  nodesById,
  onNodeClick,
}: {
  text: string;
  nodesById: Map<string, CausalNode>;
  onNodeClick: (id: string) => void;
}) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className={i > 0 ? "mt-3" : undefined}>
          {splitInline(p).map((chunk, j) => {
            if (chunk.type === "text") return <span key={j}>{chunk.text}</span>;
            const node = nodesById.get(chunk.id);
            if (!node) {
              return (
                <code
                  key={j}
                  className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.85em] text-neutral-700"
                >
                  {chunk.id}
                </code>
              );
            }
            return (
              <button
                key={j}
                onClick={() => onNodeClick(node.id)}
                className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 align-baseline font-mono text-[0.85em] text-neutral-800 transition-all hover:border-[#E838A4] hover:shadow-sm"
                title={node.label}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: LAYER_COLORS[node.layer] }}
                />
                {node.label}
              </button>
            );
          })}
        </p>
      ))}
    </>
  );
}

type Chunk = { type: "text"; text: string } | { type: "cite"; id: string };

function splitInline(text: string): Chunk[] {
  const chunks: Chunk[] = [];
  const regex = /`([^`]+)`/g;
  let last = 0;
  for (const m of text.matchAll(regex)) {
    const idx = m.index ?? 0;
    if (idx > last) chunks.push({ type: "text", text: text.slice(last, idx) });
    chunks.push({ type: "cite", id: m[1] });
    last = idx + m[0].length;
  }
  if (last < text.length) chunks.push({ type: "text", text: text.slice(last) });
  return chunks;
}

function extractCitations(text: string, validIds: Set<string>): string[] {
  const ids = new Set<string>();
  for (const m of text.matchAll(/`([^`]+)`/g)) {
    if (validIds.has(m[1])) ids.add(m[1]);
  }
  return [...ids];
}

function formatToolArgs(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length === 0) return "";
  return entries
    .slice(0, 2)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(", ");
}
