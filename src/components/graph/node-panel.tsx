"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Copy, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { iconUrlForLanguage, iconUrlForPath } from "@/lib/graph/devicon";
import {
  LAYER_COLORS,
  LAYER_LABELS,
  type CausalEdge,
  type CausalNode,
} from "@/lib/graph/types";

const EDGE_KIND_LABELS: Record<string, string> = {
  imports: "imports",
  calls: "calls",
  reads: "reads",
  writes: "writes",
  extends: "extends",
};

interface NodePanelProps {
  node: CausalNode;
  allNodes: CausalNode[];
  allEdges: CausalEdge[];
  onSelect: (n: CausalNode) => void;
  onClose: () => void;
}

export function NodePanel({
  node,
  allNodes,
  allEdges,
  onSelect,
  onClose,
}: NodePanelProps) {
  const [copied, setCopied] = useState(false);

  const { incoming, outgoing } = useMemo(() => {
    const incoming: { node: CausalNode; kind: string }[] = [];
    const outgoing: { node: CausalNode; kind: string }[] = [];
    for (const e of allEdges) {
      if (e.target === node.id) {
        const src = allNodes.find((n) => n.id === e.source);
        if (src) incoming.push({ node: src, kind: e.kind });
      }
      if (e.source === node.id) {
        const tgt = allNodes.find((n) => n.id === e.target);
        if (tgt) outgoing.push({ node: tgt, kind: e.kind });
      }
    }
    return { incoming, outgoing };
  }, [node, allNodes, allEdges]);

  const iconUrl =
    iconUrlForLanguage(node.language) ?? iconUrlForPath(node.path);

  const onCopy = () => {
    if (!node.path) return;
    navigator.clipboard.writeText(node.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <aside className="flex h-full flex-col border-l border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-white/5 p-5">
        <div className="flex min-w-0 flex-col gap-2.5">
          <div
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
            style={{ color: LAYER_COLORS[node.layer] }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: LAYER_COLORS[node.layer] }}
            />
            {LAYER_LABELS[node.layer]}
            {node.kind && (
              <span className="text-white/30">· {node.kind}</span>
            )}
          </div>
          <div className="flex items-start gap-3">
            {iconUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={iconUrl}
                alt=""
                width={18}
                height={18}
                className="mt-1 shrink-0 opacity-90"
              />
            )}
            <h2 className="break-words font-display text-lg leading-snug text-white">
              {node.label}
            </h2>
          </div>
          {node.path && (
            <button
              onClick={onCopy}
              className="group inline-flex items-center gap-1.5 text-left font-mono text-[11px] text-white/45 transition-colors hover:text-white/80"
              aria-label="Copy path"
            >
              <code className="break-all">{node.path}</code>
              {copied ? (
                <Check size={11} className="text-emerald-400" />
              ) : (
                <Copy size={11} className="opacity-0 group-hover:opacity-100" />
              )}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="shrink-0 rounded-md p-1 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 text-sm">
        {node.summary ? (
          <p className="leading-relaxed text-white/75">{node.summary}</p>
        ) : (
          <p className="text-xs italic text-white/40">
            No summary generated for this node.
          </p>
        )}

        {/* Edges */}
        {(incoming.length > 0 || outgoing.length > 0) && (
          <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
            <EdgeList
              title="Depends on"
              description="What this node imports or calls"
              edges={outgoing}
              onSelect={onSelect}
              direction="out"
            />
            <EdgeList
              title="Depended on by"
              description="What references this node"
              edges={incoming}
              onSelect={onSelect}
              direction="in"
            />
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t border-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-white/40">
            <span>{outgoing.length + incoming.length} connections</span>
          </div>
          <button
            disabled
            title="Oracle coming in Phase 3"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60 disabled:cursor-not-allowed"
          >
            Ask Oracle
            <ArrowRight size={10} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function EdgeList({
  title,
  description,
  edges,
  onSelect,
  direction,
}: {
  title: string;
  description: string;
  edges: { node: CausalNode; kind: string }[];
  onSelect: (n: CausalNode) => void;
  direction: "in" | "out";
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-white/40">
        {title}
      </div>
      <div className="mb-2 text-[10px] leading-relaxed text-white/30">
        {description}
      </div>
      {edges.length === 0 ? (
        <div className="text-[11px] italic text-white/30">—</div>
      ) : (
        <ul className="space-y-1">
          {edges.slice(0, 12).map(({ node, kind }, i) => (
            <li key={`${node.id}-${i}`}>
              <button
                onClick={() => onSelect(node)}
                className={cn(
                  "group flex w-full items-start gap-1.5 rounded px-1.5 py-1 text-left transition-colors hover:bg-white/5",
                )}
                title={node.summary ?? node.label}
              >
                <span
                  className="mt-1 h-1 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: LAYER_COLORS[node.layer] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] text-white/80 group-hover:text-white">
                    {node.label}
                  </div>
                  <div className="truncate text-[9px] text-white/35">
                    {direction === "out" ? "" : "← "}
                    {EDGE_KIND_LABELS[kind] ?? kind}
                  </div>
                </div>
              </button>
            </li>
          ))}
          {edges.length > 12 && (
            <li className="px-1.5 text-[10px] text-white/40">
              +{edges.length - 12} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
