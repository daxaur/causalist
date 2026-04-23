"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Check,
  Copy,
  FileText,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import type { CausalGraph } from "@/lib/graph/types";
import { buildPathList } from "@/lib/graph/prompt";
import { PromptPreviewModal } from "./prompt-preview";
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
  const [copied, setCopied] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const count = selectedIds.size;
  const selectedArray = Array.from(selectedIds);

  if (count === 0) return null;

  const copyPaths = async () => {
    const text = buildPathList(graph, selectedIds);
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/15 bg-black/70 p-1 pl-3 text-white shadow-lg shadow-black/40 backdrop-blur-xl"
      >
        <span className="flex items-center gap-2 pr-1 text-xs">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#E838A4]/25 font-mono text-[10px] text-[#FF9CD9]">
            {count}
          </span>
          <span className="text-white/80">selected</span>
        </span>
        <div className="mx-1 h-5 w-px bg-white/10" />
        <Action
          onClick={() => setPromptOpen(true)}
          label="Review and copy fix prompt"
          short="prompt"
          icon={<Sparkle size={12} weight="duotone" />}
          primary
        />
        <Action
          onClick={copyPaths}
          label="Copy paths"
          short="paths"
          icon={copied ? <Check size={12} /> : <FileText size={12} weight="duotone" />}
          flashing={copied}
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

      <PromptPreviewModal
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        graph={graph}
        selectedIds={selectedArray}
      />
    </>
  );
}

function Action({
  onClick,
  label,
  short,
  icon,
  flashing,
  primary,
}: {
  onClick: () => void;
  label: string;
  short: string;
  icon: React.ReactNode;
  flashing?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "group flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] transition-colors",
        primary
          ? "bg-[#E838A4] text-white hover:bg-[#C92E8E]"
          : flashing
            ? "bg-[#E838A4]/25 text-white"
            : "text-white/70 hover:bg-white/8 hover:text-white",
      )}
    >
      <span className="opacity-90 group-hover:opacity-100">{icon}</span>
      <span className="hidden sm:inline">{short}</span>
    </button>
  );
}
