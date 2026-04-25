"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  FileText,
  Fire,
  Leaf,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { iconUrlForLanguage, iconUrlForPath } from "@/lib/graph/devicon";
import type { CausalGraph } from "@/lib/graph/types";
import {
  LAYER_COLORS,
  LAYER_LABELS,
  type CausalEdge,
  type CausalNode,
} from "@/lib/graph/types";
import type { Importance } from "@/lib/graph/importance";
import { NodeNeighborhood } from "./node-neighborhood";
import { NodeDeepDive } from "./node-deep-dive";
import { PromptPreviewModal } from "./prompt-preview";

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
  importance?: Importance;
  graph: CausalGraph;
  onSelect: (n: CausalNode) => void;
  onClose: () => void;
}

export function NodePanel({
  node,
  allNodes,
  allEdges,
  importance,
  graph,
  onSelect,
  onClose,
}: NodePanelProps) {
  const [copied, setCopied] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  const { incoming, outgoing } = useMemo(() => {
    const incoming: { node: CausalNode; kind: string; verified?: boolean }[] = [];
    const outgoing: { node: CausalNode; kind: string; verified?: boolean }[] = [];
    for (const e of allEdges) {
      if (e.target === node.id) {
        const src = allNodes.find((n) => n.id === e.source);
        if (src) incoming.push({ node: src, kind: e.kind, verified: e.verified });
      }
      if (e.source === node.id) {
        const tgt = allNodes.find((n) => n.id === e.target);
        if (tgt) outgoing.push({ node: tgt, kind: e.kind, verified: e.verified });
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

  const openPromptPreview = () => setPromptOpen(true);

  return (
    <aside className="flex h-full flex-col border-l border-neutral-200 bg-white shadow-[0_0_40px_-12px_rgba(42,36,32,0.12)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-neutral-100 p-5">
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
              style={{ color: LAYER_COLORS[node.layer] }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: LAYER_COLORS[node.layer] }}
              />
              {LAYER_LABELS[node.layer]}
              {node.kind && <span className="text-neutral-400">· {node.kind}</span>}
            </div>
            {importance && <ImportanceBadge importance={importance} />}
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
            <h2 className="break-words font-display text-lg leading-snug text-neutral-900">
              {node.label}
            </h2>
          </div>
          {node.path && (
            <button
              onClick={onCopy}
              className="group inline-flex items-center gap-1.5 text-left font-mono text-[11px] text-neutral-400 transition-colors hover:text-neutral-700"
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
          className="shrink-0 rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 text-sm">
        {node.summary ? (
          <p className="leading-relaxed text-neutral-600">{node.summary}</p>
        ) : (
          <p className="text-xs italic text-neutral-400">
            No summary generated for this node.
          </p>
        )}

        {/* Deep-dive — Claude explains this file in depth */}
        <div className="mt-4">
          <NodeDeepDive
            graph={graph}
            node={node}
            onCitationClick={(id) => {
              const n = allNodes.find((x) => x.id === id);
              if (n) onSelect(n);
            }}
          />
        </div>

        {/* Review prompt — opens a modal so the user can SEE it, not just copy silently */}
        <button
          onClick={openPromptPreview}
          className="mt-3 flex w-full items-center justify-between gap-2 rounded-md border border-accent-magenta/25 bg-accent-magenta/10 px-3 py-2 text-left text-[11px] text-neutral-700 transition-colors hover:border-accent-magenta/50 hover:bg-accent-magenta/10 hover:text-neutral-900"
        >
          <span className="flex items-center gap-1.5">
            <FileText size={11} />
            Review prompt for this file
          </span>
          <span className="font-mono text-[9px] text-neutral-400">
            see before you copy
          </span>
        </button>

        {/* Visual neighborhood — a mini graph of just this node + neighbors */}
        {(incoming.length > 0 || outgoing.length > 0) && (
          <div className="mt-5">
            <div className="mb-2 font-mono text-[9px] uppercase tracking-wider text-neutral-400">
              neighborhood
            </div>
            <NodeNeighborhood
              node={node}
              allNodes={allNodes}
              allEdges={allEdges}
              onSelect={onSelect}
            />
          </div>
        )}

        {/* Edges as lists */}
        {(incoming.length > 0 || outgoing.length > 0) && (
          <div className="mt-5 grid grid-cols-2 gap-4 text-xs">
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

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-neutral-100 p-4 text-[10px] text-neutral-400">
        <span>{outgoing.length + incoming.length} connections</span>
        {importance && (
          <span className="font-mono">
            fan-in {importance.fanIn} · fan-out {importance.fanOut}
          </span>
        )}
      </div>

      <PromptPreviewModal
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        graph={graph}
        selectedIds={[node.id]}
      />
    </aside>
  );
}

function ImportanceBadge({ importance }: { importance: Importance }) {
  const { fanIn, fanOut, tier } = importance;
  const tip =
    tier === "hot"
      ? `Hot — top 10% most load-bearing. ${fanIn} files depend on this.`
      : tier === "core"
        ? `Core — top 25%. ${fanIn} dependents, ${fanOut} deps.`
        : `Leaf — nothing depends on this (safe to refactor).`;
  if (tier === "hot") {
    return (
      <span
        title={tip}
        className="inline-flex items-center gap-1 rounded-full border border-accent-magenta/40 bg-accent-magenta/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent-magenta"
      >
        <Fire size={9} weight="fill" />
        hot
      </span>
    );
  }
  if (tier === "core") {
    return (
      <span
        title={tip}
        className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-300"
      >
        <Sparkle size={9} weight="fill" />
        core
      </span>
    );
  }
  return (
    <span
      title={tip}
      className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-500"
    >
      <Leaf size={9} weight="regular" />
      leaf
    </span>
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
  edges: { node: CausalNode; kind: string; verified?: boolean }[];
  onSelect: (n: CausalNode) => void;
  direction: "in" | "out";
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-neutral-400">
        {title}
      </div>
      <div className="mb-2 text-[10px] leading-relaxed text-neutral-400">
        {description}
      </div>
      {edges.length === 0 ? (
        <div className="text-[11px] italic text-neutral-400">—</div>
      ) : (
        <ul className="space-y-1">
          {edges.slice(0, 12).map(({ node, kind, verified }, i) => (
            <li key={`${node.id}-${i}`}>
              <button
                onClick={() => onSelect(node)}
                className={cn(
                  "group flex w-full items-start gap-1.5 rounded px-1.5 py-1 text-left transition-colors hover:bg-neutral-50",
                )}
                title={
                  verified === true
                    ? `${node.summary ?? node.label} · AST-verified`
                    : verified === false
                      ? `${node.summary ?? node.label} · agent-claimed only (not in AST)`
                      : node.summary ?? node.label
                }
              >
                <span
                  className="mt-1 h-1 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: LAYER_COLORS[node.layer] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate text-[11px] text-neutral-700 group-hover:text-neutral-900">
                    <span className="truncate">{node.label}</span>
                    {verified === true && (
                      <span
                        aria-label="AST-verified"
                        className="shrink-0 font-mono text-[9px] text-emerald-600"
                      >
                        ✓
                      </span>
                    )}
                    {verified === false && (
                      <span
                        aria-label="agent-claimed only — not in AST"
                        className="shrink-0 font-mono text-[9px] text-amber-500"
                      >
                        ~
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[9px] text-neutral-400">
                    {direction === "out" ? "" : "← "}
                    {EDGE_KIND_LABELS[kind] ?? kind}
                  </div>
                </div>
              </button>
            </li>
          ))}
          {edges.length > 12 && (
            <li className="px-1.5 text-[10px] text-neutral-400">
              +{edges.length - 12} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
