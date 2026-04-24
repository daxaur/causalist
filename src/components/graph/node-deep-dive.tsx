"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Copy, Sparkle, Stop } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings";
import { ThinkingDots } from "@/components/ui/thinking";
import type { CausalGraph, CausalNode } from "@/lib/graph/types";
import { LAYER_COLORS } from "@/lib/graph/types";

const MODEL = "claude-opus-4-7";

const DEEP_DIVE_SYSTEM = `You are the **File Explainer** for Causalist. You receive ONE node from a CausalGraph plus its one-hop neighbors. Write a concise deep-dive on that file.

## Rules
- Open with one sentence naming what the file IS (not what it does incidentally).
- Then 2–4 short paragraphs covering: its responsibility, its inputs (what calls in), its outputs (what it delegates to), and why a dev might touch it.
- When you mention another file in the graph, wrap its id in backticks — the UI turns these into clickable chips.
- Short paragraphs, plain language, under 220 words total.
- Do NOT restate the neighbor list. Synthesize.
- If the node has kind "external", just briefly name what the package is and what the repo relies on it for.

Output plain Markdown. No preamble, no "here is the deep dive" header.`;

export function NodeDeepDive({
  graph,
  node,
  onCitationClick,
}: {
  graph: CausalGraph;
  node: CausalNode;
  onCitationClick?: (nodeId: string) => void;
}) {
  const settings = useSettings();
  const [text, setText] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "streaming" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const canGenerate = Boolean(settings.anthropicKey);

  const generate = async () => {
    if (!canGenerate) return;
    setError(null);
    setStatus("streaming");
    setText("");

    // Build scoped context: just this node + its 1-hop neighbors.
    const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
    const incoming: CausalNode[] = [];
    const outgoing: CausalNode[] = [];
    for (const e of graph.edges) {
      if (e.target === node.id) {
        const src = nodesById.get(e.source);
        if (src) incoming.push(src);
      } else if (e.source === node.id) {
        const tgt = nodesById.get(e.target);
        if (tgt) outgoing.push(tgt);
      }
    }

    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({
        apiKey: settings.anthropicKey,
        dangerouslyAllowBrowser: true,
      });
      const stream = await client.messages.stream({
        model: MODEL,
        max_tokens: 1024,
        system: DEEP_DIVE_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Repository: ${graph.repo}\n\nFocus node:\n\`\`\`json\n${JSON.stringify(node, null, 2)}\n\`\`\`\n\nIncoming neighbors (files that depend on this one):\n\`\`\`json\n${JSON.stringify(incoming.map((n) => ({ id: n.id, label: n.label, summary: n.summary })), null, 2)}\n\`\`\`\n\nOutgoing neighbors (files this one depends on):\n\`\`\`json\n${JSON.stringify(outgoing.map((n) => ({ id: n.id, label: n.label, summary: n.summary })), null, 2)}\n\`\`\``,
          },
        ],
      });
      let acc = "";
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          acc += event.delta.text;
          setText(acc);
        }
      }
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!canGenerate) {
    return (
      <Link
        href="/app/settings"
        className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-[11px] text-neutral-500 transition-colors hover:border-accent-magenta/50 hover:text-neutral-900"
      >
        <span className="flex items-center gap-1.5">
          <Sparkle size={11} weight="duotone" className="text-accent-magenta" />
          Connect your Anthropic key to deep-dive this file
        </span>
        <ArrowRight size={10} />
      </Link>
    );
  }

  if (status === "idle") {
    return (
      <button
        onClick={generate}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-accent-magenta/30 bg-accent-magenta/10 px-3 py-2 text-left text-[11px] text-accent-magenta transition-all hover:border-accent-magenta hover:bg-accent-magenta/20 hover:text-neutral-900"
      >
        <span className="flex items-center gap-1.5">
          <Sparkle size={11} weight="duotone" />
          Explain in depth · Claude Opus 4.7
        </span>
        <ArrowRight size={10} />
      </button>
    );
  }

  return (
    <div className="rounded-md border border-neutral-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
          <Sparkle size={10} weight="duotone" className="text-accent-magenta" />
          {status === "streaming" ? "streaming" : status === "done" ? "deep dive" : status}
        </div>
        <div className="flex items-center gap-1">
          {status === "done" && (
            <>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(text);
                }}
                title="Copy explanation"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900"
              >
                <Copy size={10} />
              </button>
              <button
                onClick={generate}
                className="rounded px-1.5 py-0.5 text-[10px] text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
              >
                regen
              </button>
            </>
          )}
          {status === "streaming" && (
            <button
              onClick={() => setStatus("done")}
              title="Stop"
              className="rounded p-1 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900"
            >
              <Stop size={10} weight="fill" />
            </button>
          )}
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto px-3 py-3 text-[12.5px] leading-[1.7] text-neutral-700">
        {status === "streaming" && text.length === 0 && (
          <ThinkingDots label="Thinking" />
        )}
        <RenderWithCitations
          text={text}
          graph={graph}
          onCitationClick={onCitationClick}
        />
        {status === "streaming" && text.length > 0 && (
          <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-accent-magenta align-middle" />
        )}
        {error && <p className="text-red-500">{error}</p>}
      </div>
    </div>
  );
}

function RenderWithCitations({
  text,
  graph,
  onCitationClick,
}: {
  text: string;
  graph: CausalGraph;
  onCitationClick?: (id: string) => void;
}) {
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
  const paragraphs = text.split(/\n\n+/);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className={i > 0 ? "mt-2.5" : undefined}>
          {splitInline(p).map((chunk, j) => {
            if (chunk.type === "text") return <span key={j}>{chunk.text}</span>;
            const node = nodesById.get(chunk.id);
            if (!node) {
              return (
                <code
                  key={j}
                  className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.88em] text-neutral-600"
                >
                  {chunk.id}
                </code>
              );
            }
            return (
              <button
                key={j}
                onClick={() => onCitationClick?.(node.id)}
                className={cn(
                  "mx-0.5 inline-flex items-center gap-1 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-px align-baseline font-mono text-[0.82em] text-neutral-800 transition-all hover:border-accent-magenta hover:text-neutral-900",
                )}
                title={node.label}
              >
                <span
                  className="h-1 w-1 rounded-full"
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
