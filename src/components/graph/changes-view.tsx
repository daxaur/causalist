"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { GitBranch, GitCommit, Minus, Plus } from "@phosphor-icons/react";
import type { CausalGraph } from "@/lib/graph/types";
import { LAYER_COLORS } from "@/lib/graph/types";
import { cn } from "@/lib/utils";
import type { SyntheticCommit } from "@/lib/graph/previews/commits";

export function ChangesView({
  graph,
  commits,
  onHighlightNodes,
}: {
  graph: CausalGraph;
  commits: SyntheticCommit[];
  onHighlightNodes?: (nodeIds: string[]) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number>(commits.length - 1);

  const nodesById = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n])),
    [graph.nodes],
  );

  if (commits.length === 0) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center text-center">
        <GitBranch size={22} weight="duotone" className="mb-4 text-[#3DD6D0]" />
        <h2 className="mb-2 font-display text-2xl font-medium tracking-tight">
          Changes timeline
        </h2>
        <p className="max-w-sm text-sm text-neutral-500">
          No commit data loaded yet for this repository. Scrub-through ships
          once the live analyze flow populates the commit list.
        </p>
      </div>
    );
  }

  const commit = commits[selectedIdx];
  const touched = commit.touched
    .map((id) => nodesById.get(id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n));

  const onSelect = (i: number) => {
    setSelectedIdx(i);
    onHighlightNodes?.(commits[i].touched);
  };

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col px-6 pt-2 pb-32">
      <motion.div
        key={commit.sha}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-neutral-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-500">
              <GitCommit size={12} />
              <span className="text-neutral-700">{commit.sha}</span>
              <span className="text-neutral-300">·</span>
              <span>{commit.author}</span>
              <span className="text-neutral-300">·</span>
              <span>{relTime(commit.date)}</span>
            </div>
            <h2 className="mt-1.5 font-display text-xl font-medium tracking-tight text-neutral-900">
              {commit.title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2 font-mono text-[11px]">
            <span className="flex items-center gap-0.5 text-emerald-600">
              <Plus size={10} weight="bold" />
              {commit.additions}
            </span>
            <span className="flex items-center gap-0.5 text-red-500">
              <Minus size={10} weight="bold" />
              {commit.deletions}
            </span>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
            touched · {touched.length}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {touched.map((n) => (
              <button
                key={n.id}
                onClick={() => onHighlightNodes?.([n.id])}
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1 font-mono text-[11px] text-neutral-700 transition-all hover:border-neutral-400 hover:shadow-sm"
                title={n.summary ?? n.label}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: LAYER_COLORS[n.layer] }}
                />
                {n.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="mt-8 flex-1">
        <Timeline
          commits={commits}
          selectedIdx={selectedIdx}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}

function Timeline({
  commits,
  selectedIdx,
  onSelect,
}: {
  commits: SyntheticCommit[];
  selectedIdx: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1 bottom-1 w-px bg-neutral-200" />
      <ul className="space-y-3">
        {commits.map((c, i) => {
          const active = i === selectedIdx;
          return (
            <li key={c.sha} className="relative pl-8">
              <button
                onClick={() => onSelect(i)}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/80"
              >
                <span
                  className={cn(
                    "absolute left-2 top-3 flex h-2.5 w-2.5 -translate-x-1/2 items-center justify-center rounded-full border-2 transition-all",
                    active
                      ? "border-[#3DD6D0] bg-[#3DD6D0] shadow-[0_0_0_4px_rgba(61,214,208,0.25)]"
                      : "border-neutral-300 bg-white",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={cn(
                        "truncate text-sm",
                        active
                          ? "font-medium text-neutral-900"
                          : "text-neutral-700",
                      )}
                    >
                      {c.title}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-neutral-400">
                      {relTime(c.date)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-neutral-400">
                    <span>{c.sha}</span>
                    <span>·</span>
                    <span>{c.author}</span>
                    <span>·</span>
                    <span>{c.touched.length} files</span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function relTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
