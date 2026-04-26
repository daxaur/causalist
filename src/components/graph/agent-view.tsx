"use client";

import type { CausalGraph } from "@/lib/graph/types";
import { AgentAssignPanel } from "./agent-assign-panel";

/**
 * Agent panel — single chat surface. The AgentAssignPanel is the chat:
 * conversation thread fills the body, composer pinned to the bottom,
 * key-gate replaces the composer when needed. We don't stack a second
 * AskView below — that was the "two text boxes" mess.
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
