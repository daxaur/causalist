"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Check,
  Copy,
  FileText,
  Sparkle,
  Trash,
  X,
} from "@phosphor-icons/react";
import type { CausalGraph } from "@/lib/graph/types";
import { buildFixPrompt, buildPathList } from "@/lib/graph/prompt";
import { cn } from "@/lib/utils";

export function SelectionToolbar({
  graph,
  selectedIds,
  onClear,
  onExplain,
}: {
  graph: CausalGraph;
  selectedIds: Set<string>;
  onClear: () => void;
  onExplain: () => void;
}) {
  const [copied, setCopied] = useState<null | "prompt" | "paths">(null);
  const count = selectedIds.size;
  if (count === 0) return null;

  const copyPrompt = async () => {
    const prompt = buildFixPrompt(graph, selectedIds);
    await navigator.clipboard.writeText(prompt);
    setCopied("prompt");
    setTimeout(() => setCopied(null), 1800);
  };
  const copyPaths = async () => {
    const text = buildPathList(graph, selectedIds);
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied("paths");
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/15 bg-black/70 p-1 pl-3 text-white shadow-lg shadow-black/40 backdrop-blur-xl"
    >
      <span className="flex items-center gap-2 pr-1 text-xs">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#E838A4]/20 font-mono text-[10px] text-[#FF5CC0]">
          {count}
        </span>
        <span className="text-white/80">selected</span>
      </span>
      <div className="mx-1 h-5 w-px bg-white/10" />
      <Action
        onClick={copyPrompt}
        label="Copy fix prompt"
        short="prompt"
        icon={copied === "prompt" ? <Check size={12} /> : <Sparkle size={12} weight="duotone" />}
        flashing={copied === "prompt"}
      />
      <Action
        onClick={copyPaths}
        label="Copy paths"
        short="paths"
        icon={copied === "paths" ? <Check size={12} /> : <FileText size={12} weight="duotone" />}
        flashing={copied === "paths"}
      />
      <Action
        onClick={onExplain}
        label="Explain with Oracle"
        short="explain"
        icon={<Copy size={12} weight="duotone" />}
      />
      <div className="mx-1 h-5 w-px bg-white/10" />
      <button
        onClick={onClear}
        aria-label="Clear selection"
        title="Clear (Esc)"
        className="flex h-7 w-7 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/5 hover:text-white"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}

function Action({
  onClick,
  label,
  short,
  icon,
  flashing,
}: {
  onClick: () => void;
  label: string;
  short: string;
  icon: React.ReactNode;
  flashing?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "group flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] transition-colors",
        flashing
          ? "bg-[#E838A4]/25 text-white"
          : "text-white/70 hover:bg-white/8 hover:text-white",
      )}
    >
      <span className="opacity-80 group-hover:opacity-100">{icon}</span>
      <span className="hidden sm:inline">{short}</span>
    </button>
  );
}
