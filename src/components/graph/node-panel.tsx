"use client";

import { X } from "@phosphor-icons/react";
import {
  LAYER_COLORS,
  LAYER_LABELS,
  type CausalNode,
} from "@/lib/graph/types";

export function NodePanel({
  node,
  onClose,
}: {
  node: CausalNode;
  onClose: () => void;
}) {
  return (
    <aside className="flex h-full flex-col border-l border-white/10 bg-[#0a0a0f]/95 p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
            style={{ color: LAYER_COLORS[node.layer] }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: LAYER_COLORS[node.layer] }}
            />
            {LAYER_LABELS[node.layer]}
          </div>
          <h2 className="break-all font-display text-lg leading-snug text-white">
            {node.label}
          </h2>
          {node.path && (
            <code className="break-all font-mono text-[11px] text-white/50">
              {node.path}
            </code>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="rounded-md p-1 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      {node.summary && (
        <p className="mt-5 text-sm leading-relaxed text-white/75">
          {node.summary}
        </p>
      )}

      <div className="mt-auto space-y-2 border-t border-white/10 pt-4 text-xs text-white/40">
        <div className="flex justify-between">
          <span>kind</span>
          <span className="font-mono text-white/70">{node.kind ?? "—"}</span>
        </div>
        {node.language && (
          <div className="flex justify-between">
            <span>language</span>
            <span className="font-mono text-white/70">{node.language}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
