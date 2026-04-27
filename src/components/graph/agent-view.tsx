"use client";

import { useMemo } from "react";
import type { CausalGraph } from "@/lib/graph/types";
import { AgentAssignPanel } from "./agent-assign-panel";
import { OracleAsk } from "./oracle-ask";

/**
 * Agent panel — Oracle (Managed Agents) on top, classic refactor
 * chat below. The Oracle uses client.beta.sessions for multi-turn
 * tool use over the 10 graph-query tools; the chat below is the
 * single-shot file-edit flow.
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
  // Build a one-line context string the Oracle can use to scope the
  // question to whatever the user has selected on the graph.
  const oracleContext = useMemo(() => {
    if (selectedIds.size === 0) return undefined;
    const ids = Array.from(selectedIds).slice(0, 8);
    return `User has selected these node ids in the graph: ${ids.join(", ")}${
      selectedIds.size > 8 ? ` (+${selectedIds.size - 8} more)` : ""
    }`;
  }, [selectedIds]);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-neutral-200 bg-white p-3">
        <OracleAsk graph={graph} context={oracleContext} />
      </div>
      <div className="min-h-0 flex-1">
        <AgentAssignPanel
          graph={graph}
          selectedIds={selectedIds}
          onHighlight={onHighlight}
          onAssign={onAssign}
        />
      </div>
    </div>
  );
}
