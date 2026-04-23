"use client";

import { useState } from "react";
import { AskView } from "@/components/graph/ask-view";
import { CausalGraphViewer } from "@/components/graph/causal-graph-viewer";
import { ChangesView } from "@/components/graph/changes-view";
import { ModeSwitcher, type PreviewMode } from "@/components/graph/mode-switcher";
import { type PreviewMeta } from "@/lib/graph/previews";
import { commitsFor } from "@/lib/graph/previews/commits";

export function PreviewClient({ preview }: { preview: PreviewMeta }) {
  const [mode, setMode] = useState<PreviewMode>("graph");
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const commits = commitsFor(preview.slug);

  return (
    <main className="relative h-[calc(100vh-57px)] w-full overflow-hidden bg-white">
      {mode === "graph" && (
        <div className="absolute inset-0">
          <CausalGraphViewer
            graph={preview.graph}
            highlightedIds={highlighted}
            onAskAboutSelection={(ids) => {
              setHighlighted(ids);
              setMode("ask");
            }}
          />
        </div>
      )}
      {mode === "changes" && (
        <div className="absolute inset-0 overflow-y-auto px-4 pt-6 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <ChangesView
              graph={preview.graph}
              commits={commits}
              onHighlightNodes={setHighlighted}
            />
          </div>
        </div>
      )}
      {mode === "ask" && (
        <div className="absolute inset-0 overflow-y-auto px-4 pt-6 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <AskView graph={preview.graph} onHighlightNodes={setHighlighted} />
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-4">
        <ModeSwitcher mode={mode} onChange={setMode} />
      </div>
    </main>
  );
}
