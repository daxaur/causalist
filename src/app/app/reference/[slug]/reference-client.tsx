"use client";

import Link from "next/link";
import { useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { CausalGraphViewer } from "@/components/graph/causal-graph-viewer";
import { REFERENCES, type ReferenceMeta } from "@/lib/graph/references";

/**
 * Reference viewer — single graph view. Ask + Agents are reachable via
 * the right-side panel (Inspector / Ask / Agents tabs).
 */
export function ReferenceClient({ reference }: { reference: ReferenceMeta }) {
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const idx = REFERENCES.findIndex((r) => r.slug === reference.slug);
  const prev = idx > 0 ? REFERENCES[idx - 1] : null;
  const next = idx < REFERENCES.length - 1 ? REFERENCES[idx + 1] : null;

  return (
    <main className="absolute inset-0 overflow-hidden bg-[#FAFAF8]">
      <div className="absolute inset-0">
        <CausalGraphViewer
          graph={reference.graph}
          highlightedIds={highlighted}
          onAskAboutSelection={(ids) => setHighlighted(ids)}
        />
      </div>

      {/* Prev/next arrows for sibling references */}
      {prev && (
        <Link
          href={`/app/reference/${prev.slug}`}
          title={prev.title}
          className="absolute left-4 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-neutral-600 backdrop-blur transition-colors hover:border-neutral-300 hover:text-neutral-900"
          aria-label={`Previous: ${prev.title}`}
        >
          <CaretLeft size={14} weight="bold" />
        </Link>
      )}
      {next && (
        <Link
          href={`/app/reference/${next.slug}`}
          title={next.title}
          className="absolute right-4 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-neutral-600 backdrop-blur transition-colors hover:border-neutral-300 hover:text-neutral-900"
          aria-label={`Next: ${next.title}`}
        >
          <CaretRight size={14} weight="bold" />
        </Link>
      )}
    </main>
  );
}
