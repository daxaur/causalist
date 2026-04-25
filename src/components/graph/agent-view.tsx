"use client";

import type { CausalGraph } from "@/lib/graph/types";
import { AgentAssignPanel } from "./agent-assign-panel";
import { AskView } from "./ask-view";

/**
 * Unified Agent panel — fuses preset agent runs (Auditor / Security /
 * Performance / Refactor that operate on selection) with free-form
 * chat (the Oracle, which uses graph-query tools to answer anything).
 *
 * Layout: presets + run history on top, separator, free-form chat
 * with sticky composer on the bottom. Both are scrollable
 * independently so the panel always shows progress on what just
 * happened.
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
