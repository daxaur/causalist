"use client";

import type { CausalGraph } from "@/lib/graph/types";
import { AgentAssignPanel } from "./agent-assign-panel";
import { AskView } from "./ask-view";

/**
 * Unified Agent panel — plan-mode for code review on the selection
 * (one textarea + suggestion chips → real Claude run, AST-anchored,
 * patches stream in, optional PR push) plus free-form chat below for
 * graph questions that don't need a write.
 *
 * Layout: plan composer + run history on top, separator, free-form
 * chat with sticky composer on the bottom. Both scroll independently.
 */
export function AgentView({
  graph,
  selectedIds,
  onHighlight,
  onAssign,
}: {
  graph: CausalGraph;
  selectedIds: Set<string>;
  onHighlight?: (ids: string[]) => void;
  onAssign?: (ids: string[], status: "reviewed" | "risky" | "fixed") => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Preset agents — top half */}
      <div className="flex h-1/2 min-h-0 shrink-0 flex-col border-b border-neutral-200">
        <AgentAssignPanel
          graph={graph}
          selectedIds={selectedIds}
          onHighlight={onHighlight}
          onAssign={onAssign}
        />
      </div>

      {/* Free-form chat — bottom half */}
      <div className="flex h-1/2 min-h-0 flex-col">
        <AskView graph={graph} onHighlightNodes={onHighlight} />
      </div>
    </div>
  );
}
