"use client";

import { useState } from "react";
import { CausalGraphViewer } from "@/components/graph/causal-graph-viewer";
import { type PreviewMeta } from "@/lib/graph/previews";

/**
 * Preview viewer — single graph view. Ask + Agents are reachable via
 * the right-side panel (Inspector / Ask / Agents tabs).
 */
export function PreviewClient({ preview }: { preview: PreviewMeta }) {
  const [highlighted, setHighlighted] = useState<string[]>([]);

  return (
    <main className="absolute inset-0 overflow-hidden bg-[#FAFAF8]">
      <div className="absolute inset-0">
        <CausalGraphViewer
          graph={preview.graph}
          highlightedIds={highlighted}
          onAskAboutSelection={(ids) => setHighlighted(ids)}
        />
      </div>
    </main>
  );
}
