"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  Key,
  PaperPlaneRight,
  Sparkle,
  Stop,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings";
import type { CausalGraph, CausalNode } from "@/lib/graph/types";
import { LAYER_COLORS } from "@/lib/graph/types";

const MODEL = "claude-opus-4-7";

const ASK_SYSTEM = `You are the **Oracle** for Causalist — a tool that maps code repositories into causal graphs.

You receive a CausalGraph for the current repository and a user question. Use the graph as authoritative context — its nodes are every file/module/function, its edges are every import/call/read/write/extends relationship.

## Answering rules
- Be concrete. Name specific nodes by their \`id\` wrapped in backticks — the UI turns them into clickable chips that highlight the node on the graph.
- Trace consequences through outgoing edges when the question is "what if I delete X" or "what breaks if...". Use extended reasoning for multi-hop traces.
- When the question is "what does X do", summarize by reading X's summary field + its neighbors.
- Keep paragraphs short. 2–4 sentences each.
- If the graph doesn't contain enough information to answer, say so rather than inventing.
- Prefer plural voice ("files that depend on X are ...") over first person.
- Do NOT restate the full graph. Answer the question.

Output plain Markdown. No JSON, no code fences around the answer.`;

const SUGGESTIONS = [
  "What does this codebase actually do?",
  "What would break if I deleted the most-imported file?",
  "Which files are safest to refactor?",
];

export function AskView({
  graph,
  onHighlightNodes,
}: {
  graph: CausalGraph;
  onHighlightNodes?: (nodeIds: string[]) => void;
}) {
  const settings = useSettings();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<
    { role: "user" | "oracle"; text: string; cited: string[] }[]
  >([]);
  const [streaming, setStreaming] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
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
  }, [history, currentAnswer]);

  // Notify the graph of citations as streaming progresses
  useEffect(() => {
    if (!onHighlightNodes) return;
    const ids = extractCitations(currentAnswer, nodeIds);
    if (ids.length) onHighlightNodes(ids);
  }, [currentAnswer, nodeIds, onHighlightNodes]);

  const canAsk = Boolean(settings.anthropicKey);

  const submit = async (q: string) => {
    if (!canAsk) return;
    const trimmed = q.trim();
    if (!trimmed) return;

    setHistory((h) => [...h, { role: "user", text: trimmed, cited: [] }]);
    setQuestion("");
    setStreaming(true);
    setCurrentAnswer("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({
        apiKey: settings.anthropicKey,
        dangerouslyAllowBrowser: true,
      });
      const stream = await client.messages.stream({
        model: MODEL,
        max_tokens: 2048,
        system: ASK_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Graph for ${graph.repo}:\n\n\`\`\`json\n${JSON.stringify(
              { nodes: graph.nodes, edges: graph.edges },
              null,
              2,
            )}\n\`\`\`\n\nQuestion: ${trimmed}`,
          },
        ],
      });

      let acc = "";
      for await (const event of stream) {
        if (controller.signal.aborted) break;
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          acc += event.delta.text;
          setCurrentAnswer(acc);
        }
      }

      const cited = extractCitations(acc, nodeIds);
      setHistory((h) => [...h, { role: "oracle", text: acc, cited }]);
      setCurrentAnswer("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setHistory((h) => [
        ...h,
        { role: "oracle", text: `⚠ ${msg}`, cited: [] },
      ]);
      setCurrentAnswer("");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

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
          Oracle answers from the graph as context. Your key stays in your
          browser — calls go directly to Anthropic.
        </p>
        <Link
          href="/settings"
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-sm text-white transition-colors hover:bg-neutral-800"
        >
          Add your key
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-6 pt-6">
      <div
        ref={scrollRef}
        className="flex-1 space-y-6 overflow-y-auto pb-32 pr-2"
      >
        {history.length === 0 && !streaming && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="py-10 text-center"
          >
            <Sparkle
              size={22}
              weight="duotone"
              className="mx-auto mb-4 text-[#D97757]"
            />
            <h2 className="mb-2 font-display text-3xl font-medium tracking-[-0.02em]">
              Ask anything about{" "}
              <span className="font-mono text-[0.8em] text-neutral-500">
                {graph.repo}
              </span>
            </h2>
            <p className="mx-auto mb-7 max-w-md text-sm text-neutral-500">
              Oracle traces through the graph to answer. File names in the
              answer become clickable chips that highlight nodes.
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

        {history.map((msg, i) => (
          <Message
            key={i}
            role={msg.role}
            text={msg.text}
            nodesById={nodesById}
            onNodeClick={(id) => onHighlightNodes?.([id])}
          />
        ))}

        {streaming && currentAnswer && (
          <Message
            role="oracle"
            text={currentAnswer}
            streaming
            nodesById={nodesById}
            onNodeClick={(id) => onHighlightNodes?.([id])}
          />
        )}
      </div>

      {/* Composer, pinned relative to the viewport bottom */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-20 flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-2xl">
          <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white/95 p-2 shadow-lg shadow-black/5 backdrop-blur">
            <input
              autoFocus
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !streaming) {
                  e.preventDefault();
                  submit(question);
                }
              }}
              placeholder={
                streaming ? "thinking…" : "Ask Oracle anything about the graph"
              }
              disabled={streaming}
              className="w-full bg-transparent px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none disabled:opacity-70"
            />
            {streaming ? (
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

function Message({
  role,
  text,
  streaming,
  nodesById,
  onNodeClick,
}: {
  role: "user" | "oracle";
  text: string;
  streaming?: boolean;
  nodesById: Map<string, CausalNode>;
  onNodeClick: (id: string) => void;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm text-white">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#d97757]/30 bg-[#fff7f0]">
        <Sparkle size={11} weight="duotone" className="text-[#D97757]" />
      </div>
      <div className="flex-1 text-[15px] leading-[1.75] text-neutral-800">
        <RenderWithCitations
          text={text}
          nodesById={nodesById}
          onNodeClick={onNodeClick}
        />
        {streaming && (
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-[#D97757] align-middle" />
        )}
      </div>
    </div>
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
  // Split on paragraphs
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
                className={cn(
                  "mx-0.5 inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 align-baseline font-mono text-[0.85em] text-neutral-800 transition-all hover:border-neutral-400 hover:shadow-sm",
                )}
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
