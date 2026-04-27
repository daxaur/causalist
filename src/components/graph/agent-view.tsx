"use client";

import type { CausalGraph } from "@/lib/graph/types";
import { AgentAssignPanel } from "./agent-assign-panel";

/**
 * Agent panel — single chat surface routed through the existing
 * causal-lens swarm picker (Cause / Effect / Mechanism / Intervention
 * / Counterfactual). The Managed Agent Oracle is invoked under the
 * hood when the user picks 1 agent (Oracle); multi-agent runs use
 * the parallel causal-lens path. One ModelPill controls both.
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
    <AgentAssignPanel
      graph={graph}
      selectedIds={selectedIds}
      onHighlight={onHighlight}
      onAssign={onAssign}
    />
  );
}
