"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { X } from "@phosphor-icons/react";
import type { CausalGraph, CausalNode } from "@/lib/graph/types";
import type { ImportanceSummary } from "@/lib/graph/importance";
import { NodePanel } from "./node-panel";
import { AgentView } from "./agent-view";
import { cn } from "@/lib/utils";

type Tab = "inspector" | "agent";

/**
 * Cursor-style right panel — minimal text-only tabs, keyboard
 * shortcuts (⌘I inspector, ⌘L chat, ⌘W close). Inspector shows the
 * node's metadata; Agent runs plan-mode Claude on the selection.
 */
export function RightPanel({
  graph,
  focusedNode,
  selectedIds,
  importance,
  initialTab,
  onSelect,
  onClose,
  onHighlightNodes,
  onAssign,
}: {
  graph: CausalGraph;
  focusedNode: CausalNode | null;
  selectedIds: Set<string>;
  importance: ImportanceSummary;
  /** When set, the panel mounts with this tab active (used by ⌘L/⌘I from the viewer). */
  initialTab?: Tab | null;
  onSelect: (n: CausalNode) => void;
  onClose: () => void;
  onHighlightNodes?: (ids: string[]) => void;
  onAssign?: (ids: string[], status: "reviewed" | "risky" | "fixed") => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab ?? "inspector");

  // Re-flip the tab when the viewer-level shortcut updates initialTab
  // (e.g. user hits ⌘L while inspector tab is showing).
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  // Cursor-style shortcuts. Listen on the window so they fire whether
  // focus is on the canvas, inspector, or chat composer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (!cmd) return;
      // Ignore if user is typing in a non-empty input/textarea, except
      // for the explicit close shortcut.
      const target = e.target as HTMLElement | null;
      const inField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (e.key === "i" || e.key === "I") {
        if (inField) return;
        e.preventDefault();
        setTab("inspector");
      } else if (e.key === "l" || e.key === "L") {
        // Cursor parity — ⌘L opens the chat. Override even in fields
        // because the user is asking to *go* to the agent panel.
        e.preventDefault();
        setTab("agent");
      } else if (e.key === "w" || e.key === "W") {
        if (inField) return;
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.aside
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-0 top-0 z-20 flex h-full w-full max-w-[420px] flex-col border-l border-neutral-200 bg-white shadow-[0_0_40px_-12px_rgba(42,36,32,0.12)]"
    >
      {/* Header — minimal Cursor-style tabs (text only) + close */}
      <div className="flex items-center justify-between border-b border-neutral-200 pl-1 pr-1.5">
        <div className="flex items-center">
          <TabButton
            active={tab === "inspector"}
            onClick={() => setTab("inspector")}
            label="Inspector"
            shortcut="⌘I"
          />
          <TabButton
            active={tab === "agent"}
            onClick={() => setTab("agent")}
            label="Agent"
            shortcut="⌘L"
            badge={selectedIds.size > 0 ? String(selectedIds.size) : undefined}
          />
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel (⌘W)"
          title="Close (⌘W)"
          className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
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
              title="Nothing selected"
              body="Click a node in the graph to inspect it, or hit ⌘L to open Agent."
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
  label,
  badge,
  shortcut,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: string;
  shortcut?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={cn(
        "group relative flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] transition-colors",
        active ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-900",
      )}
    >
      <span className="font-medium">{label}</span>
      {badge && (
        <span
          className={cn(
            "rounded-full px-1.5 font-mono text-[9px]",
            active
              ? "bg-accent-magenta/15 text-accent-magenta"
              : "bg-neutral-100 text-neutral-500",
          )}
        >
          {badge}
        </span>
      )}
      {shortcut && (
        <span className="hidden font-mono text-[9px] text-neutral-300 group-hover:inline">
          {shortcut}
        </span>
      )}
      {active && (
        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent-magenta" />
      )}
    </button>
  );
}

function EmptyHint({ title, body }: { title: string; body: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="font-display text-[14px] font-medium text-neutral-900">
        {title}
      </div>
      <p className="mt-1 max-w-[280px] text-[12px] leading-relaxed text-neutral-500">
        {body}
      </p>
    </div>
  );
}
