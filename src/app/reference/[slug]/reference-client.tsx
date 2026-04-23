"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import {
  BookOpen,
  Lightning,
  Sparkle,
} from "@phosphor-icons/react";
import { AskView } from "@/components/graph/ask-view";
import { CausalGraphViewer } from "@/components/graph/causal-graph-viewer";
import {
  ModeSwitcher,
  type PreviewMode,
} from "@/components/graph/mode-switcher";
import { REFERENCES, type ReferenceMeta } from "@/lib/graph/references";

export function ReferenceClient({ reference }: { reference: ReferenceMeta }) {
  const [mode, setMode] = useState<PreviewMode>("graph");
  const [highlighted, setHighlighted] = useState<string[]>([]);

  return (
    <main className="relative flex min-h-[calc(100vh-57px)] flex-col bg-white">
      <motion.header
        className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-8 pb-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-end justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              <BookOpen size={10} weight="duotone" /> Reference
            </p>
            <h1 className="mt-1 font-display text-3xl font-medium tracking-[-0.02em] text-neutral-900 sm:text-4xl">
              {reference.title}
            </h1>
            <p className="mt-1.5 flex items-center gap-2 text-sm text-neutral-500">
              <Sparkle size={11} weight="duotone" className="text-accent-magenta" />
              {reference.subtitle}
            </p>
          </div>
          <div className="hidden items-center gap-4 font-mono text-[11px] text-neutral-500 sm:flex">
            <Stat label="nodes" value={reference.graph.nodes.length} />
            <Stat label="edges" value={reference.graph.edges.length} />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-accent-magenta/20 bg-accent-magenta/5 px-4 py-3 text-[13px] text-neutral-700">
          <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent-magenta">
            <Lightning size={10} weight="fill" />
            Why this graph exists
          </div>
          {reference.why}
        </div>
      </motion.header>

      {/* Other references */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-2 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {REFERENCES.map((r) => (
            <Link
              key={r.slug}
              href={`/reference/${r.slug}`}
              aria-current={r.slug === reference.slug ? "page" : undefined}
              className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] transition-colors ${
                r.slug === reference.slug
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-900"
              }`}
            >
              {r.slug}
            </Link>
          ))}
        </div>
      </div>

      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-28 sm:px-6 lg:px-8"
      >
        {mode === "graph" && (
          <div className="h-[calc(100vh-360px)] min-h-[520px] w-full">
            <CausalGraphViewer
              graph={reference.graph}
              highlightedIds={highlighted}
              onAskAboutSelection={(ids) => {
                setHighlighted(ids);
                setMode("ask");
              }}
            />
          </div>
        )}
        {mode === "ask" && (
          <div className="flex flex-col">
            <div className="mx-auto mb-4 flex max-w-3xl flex-wrap gap-1.5 px-6">
              {reference.suggestedQuestions.map((q) => (
                <span
                  key={q}
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-[10px] text-neutral-500"
                >
                  try: {q}
                </span>
              ))}
            </div>
            <AskView
              graph={reference.graph}
              onHighlightNodes={setHighlighted}
            />
          </div>
        )}
        {mode !== "graph" && mode !== "ask" && (
          <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center px-6 text-center text-sm text-neutral-500">
            <Sparkle
              size={18}
              weight="duotone"
              className="mb-3 text-accent-magenta"
            />
            This mode is disabled on reference graphs — they&rsquo;re teaching
            material, not a live repository.
          </div>
        )}
      </motion.div>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
        <ModeSwitcher mode={mode} onChange={setMode} />
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-neutral-800">{value.toLocaleString()}</span>
      <span className="uppercase tracking-wider text-neutral-400">{label}</span>
    </div>
  );
}
