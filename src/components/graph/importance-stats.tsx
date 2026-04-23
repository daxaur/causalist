"use client";

import { Fire, Leaf, Sparkle } from "@phosphor-icons/react";
import type { ImportanceSummary } from "@/lib/graph/importance";

export function ImportanceStats({
  summary,
  totalNodes,
}: {
  summary: ImportanceSummary;
  totalNodes: number;
}) {
  const hot = summary.hotIds.size;
  const core = summary.coreIds.size;
  const leaf = Math.max(0, totalNodes - hot - core);

  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-md border border-white/10 bg-black/40 px-2 py-1 font-mono text-[10px] text-white/70 backdrop-blur">
      <span
        title={`${hot} load-bearing files — top 10% by fan-in. Changing any is a risky edit.`}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[#FF9CD9]"
      >
        <Fire size={9} weight="fill" />
        {hot} hot
      </span>
      <span className="text-white/15">·</span>
      <span
        title={`${core} core files — top 25% by fan-in.`}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-amber-300"
      >
        <Sparkle size={9} weight="fill" />
        {core} core
      </span>
      <span className="text-white/15">·</span>
      <span
        title={`${leaf} leaf files — nothing depends on them (safe to refactor).`}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-white/50"
      >
        <Leaf size={9} />
        {leaf} leaf
      </span>
    </div>
  );
}
