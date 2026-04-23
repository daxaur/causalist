"use client";

import Link from "next/link";
import { useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
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
  const idx = REFERENCES.findIndex((r) => r.slug === reference.slug);
  const prev = idx > 0 ? REFERENCES[idx - 1] : null;
  const next = idx < REFERENCES.length - 1 ? REFERENCES[idx + 1] : null;

  return (
    <main className="relative h-[calc(100vh-57px)] w-full overflow-hidden bg-white">
      {mode === "graph" && (
        <div className="absolute inset-0">
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
        <div className="absolute inset-0 overflow-y-auto px-4 pt-6 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <div className="mb-4 flex flex-wrap gap-1.5">
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
        </div>
      )}

      {/* Prev/next arrows overlaid on the canvas, so you feel the set
          of references even when you're deep inside one. */}
      {prev && (
        <Link
          href={`/reference/${prev.slug}`}
          title={prev.title}
          className="absolute left-4 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/70 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
          aria-label={`Previous: ${prev.title}`}
        >
          <CaretLeft size={14} weight="bold" />
        </Link>
      )}
      {next && (
        <Link
          href={`/reference/${next.slug}`}
          title={next.title}
          className="absolute right-4 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/70 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
          aria-label={`Next: ${next.title}`}
        >
          <CaretRight size={14} weight="bold" />
        </Link>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-4">
        <ModeSwitcher mode={mode} onChange={setMode} />
      </div>

      {/* Title strip floats at the top, small and unobtrusive */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1 font-mono text-[11px] text-white/80 backdrop-blur">
        <span className="text-white/40">reference ·</span>
        <span className="text-white">{reference.title}</span>
      </div>
    </main>
  );
}
