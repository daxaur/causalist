"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  CaretDown,
  GitCommit,
  Minus,
  Plus,
} from "@phosphor-icons/react";
import type { SyntheticCommit } from "@/lib/graph/previews/commits";
import { cn } from "@/lib/utils";

export interface DiffRange {
  baseSha: string;
  headSha: string;
}

export function CommitDiffPicker({
  commits,
  value,
  onChange,
  summary,
}: {
  commits: SyntheticCommit[];
  value: DiffRange;
  onChange: (next: DiffRange) => void;
  summary?: {
    added: number;
    removed: number;
    modified: number;
    edgesAdded: number;
    edgesRemoved: number;
  };
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
      <CommitPill
        label="base"
        sha={value.baseSha}
        commits={commits}
        onPick={(sha) => onChange({ ...value, baseSha: sha })}
      />
      <ArrowRight size={13} className="text-neutral-400" />
      <CommitPill
        label="head"
        sha={value.headSha}
        commits={commits}
        onPick={(sha) => onChange({ ...value, headSha: sha })}
      />
      {summary && (
        <div className="ml-auto flex items-center gap-3 font-mono text-[11px]">
          <span className="flex items-center gap-0.5 text-[#3FB950]">
            <Plus size={10} weight="bold" /> {summary.added}
          </span>
          <span className="flex items-center gap-0.5 text-[#F85149]">
            <Minus size={10} weight="bold" /> {summary.removed}
          </span>
          <span className="flex items-center gap-0.5 text-[#D29922]">
            ~{summary.modified}
          </span>
          <span className="text-neutral-400">
            +{summary.edgesAdded}/-{summary.edgesRemoved} edges
          </span>
        </div>
      )}
    </div>
  );
}

function CommitPill({
  label,
  sha,
  commits,
  onPick,
}: {
  label: string;
  sha: string;
  commits: SyntheticCommit[];
  onPick: (sha: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const commit = commits.find((c) => c.sha === sha);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-neutral-300"
      >
        <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">
          {label}
        </span>
        <GitCommit size={11} className="text-neutral-500" />
        <span className="font-mono text-xs text-neutral-900">
          {commit ? commit.sha : "—"}
        </span>
        <CaretDown
          size={10}
          weight="bold"
          className="text-neutral-400 transition-transform group-hover:text-neutral-600"
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 top-full z-30 mt-2 max-h-72 w-80 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-lg"
          >
            {commits.map((c) => (
              <button
                key={c.sha}
                onClick={() => {
                  onPick(c.sha);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-neutral-50",
                  c.sha === sha && "bg-neutral-100",
                )}
              >
                <GitCommit
                  size={10}
                  className="mt-1 shrink-0 text-neutral-400"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-neutral-900">
                    {c.title}
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
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
