"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Info, Lightning, X } from "@phosphor-icons/react";
import type { CausalGraph, CausalNode } from "@/lib/graph/types";
import type { ImportanceSummary } from "@/lib/graph/importance";
import { NodePanel } from "./node-panel";
import { AgentView } from "./agent-view";
import { cn } from "@/lib/utils";

type Tab = "inspector" | "agent";

/**
 * IDE-style right panel — two tabs: Inspector and Agent.
 * Inspector shows node metadata + neighborhood. Agent runs plan-mode
 * Claude on the selection (write a plan → stream patches → open PR)
 * plus free-form chat for graph questions.
 */
export function RightPanel({
  graph,
  focusedNode,
  selectedIds,
  importance,
  onSelect,
  onClose,
  onHighlightNodes,
  onAssign,
}: {
  graph: CausalGraph;
  focusedNode: CausalNode | null;
  selectedIds: Set<string>;
  importance: ImportanceSummary;
  onSelect: (n: CausalNode) => void;
  onClose: () => void;
  onHighlightNodes?: (ids: string[]) => void;
  onAssign?: (ids: string[], status: "reviewed" | "risky" | "fixed") => void;
}) {
  const [tab, setTab] = useState<Tab>("inspector");

  return (
    <motion.aside
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-0 top-0 z-20 flex h-full w-full max-w-[420px] flex-col border-l border-neutral-200 bg-white shadow-[0_0_40px_-12px_rgba(42,36,32,0.12)]"
    >
      {/* Header — tabs + close */}
      <div className="flex items-center justify-between border-b border-neutral-200">
        <div className="flex">
          <TabButton
            active={tab === "inspector"}
            onClick={() => setTab("inspector")}
            icon={<Info size={12} weight="duotone" />}
            label="Inspector"
          />
          <TabButton
            active={tab === "agent"}
            onClick={() => setTab("agent")}
            icon={<Lightning size={12} weight="fill" />}
            label="Agent"
            badge={selectedIds.size > 0 ? String(selectedIds.size) : undefined}
          />
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="mr-2 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <X size={12} />
        </button>
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-hidden">
        {tab === "inspector" &&
          (focusedNode ? (
            <div className="h-full overflow-hidden">
              <NodePanel
                node={focusedNode}
                allNodes={graph.nodes}
                allEdges={graph.edges}
                importance={importance.byId.get(focusedNode.id)}
                graph={graph}
                onSelect={onSelect}
                onClose={onClose}
              />
            </div>
          ) : (
            <EmptyHint
              icon={<Info size={16} weight="duotone" />}
              title="Nothing selected"
              body="Click a node in the graph to inspect it."
            />
          ))}

        {tab === "agent" && (
          <AgentView
            graph={graph}
            selectedIds={selectedIds}
            onHighlight={onHighlightNodes}
            onAssign={onAssign}
          />
        )}
      </div>
    </motion.aside>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-1.5 px-4 py-3 text-[12px] transition-colors",
        active ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-900",
      )}
    >
      <span className={active ? "text-accent-magenta" : "text-neutral-400"}>
        {icon}
      </span>
      {label}
      {badge && (
        <span className="rounded-full bg-accent-magenta/10 px-1.5 font-mono text-[9px] text-accent-magenta">
          {badge}
        </span>
      )}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent-magenta" />
      )}
    </button>
  );
}

function EmptyHint({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-500">
        {icon}
      </div>
      <div className="font-display text-[14px] font-medium text-neutral-900">
        {title}
      </div>
      <p className="mt-1 max-w-[240px] text-[12px] text-neutral-500">{body}</p>
    </div>
  );
}
