"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle,
  Plus,
  Sparkle,
  Warning,
} from "@phosphor-icons/react";
import type { CausalGraph } from "@/lib/graph/types";
import { CausalistSpinner } from "@/components/ui/causalist-loader";
import { RotatingVerb } from "@/components/ui/thinking";
import { cn } from "@/lib/utils";

type AssignStatus = "idle" | "running" | "done" | "error";

interface Assignment {
  id: string;
  agentName: string;
  agentRole: string;
  nodeIds: string[];
  status: AssignStatus;
  progress: number; // 0..1
  findings: { nodeId: string; kind: "reviewed" | "risky"; note: string }[];
  startedAt: number;
}

const AGENT_ROSTER = [
  { name: "Auditor", role: "Checks logic for bugs and dead code" },
  { name: "Security", role: "Flags auth gaps and tainted paths" },
  { name: "Performance", role: "Finds hot paths and N+1s" },
  { name: "Refactor", role: "Suggests safe structural improvements" },
] as const;

const FINDING_NOTES = [
  "no unhandled exceptions",
  "input validated at boundary",
  "dead branch in else",
  "TODO left in code",
  "missing null check",
  "extracted into shared util",
  "tight loop over large set",
  "stale dep in useEffect",
  "edge kind verified via AST",
  "silent catch swallows error",
];

export function AgentAssignPanel({
  graph,
  selectedIds,
  onAssign,
  onHighlight,
}: {
  graph: CausalGraph;
  selectedIds: Set<string>;
  onAssign?: (ids: string[], status: "reviewed" | "risky") => void;
  onHighlight?: (ids: string[]) => void;
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const assign = async (agent: (typeof AGENT_ROSTER)[number]) => {
    const nodeIds = Array.from(selectedIds);
    if (nodeIds.length === 0) {
      toast.info("Select nodes first", {
        description: "Click a node in the graph — shift-click to add more.",
      });
      return;
    }
    const id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const assignment: Assignment = {
      id,
      agentName: agent.name,
      agentRole: agent.role,
      nodeIds,
      status: "running",
      progress: 0,
      findings: [],
      startedAt: Date.now(),
    };
    setAssignments((a) => [assignment, ...a]);
    toast.success(`${agent.name} · started`, {
      description: `Reviewing ${nodeIds.length} node${nodeIds.length === 1 ? "" : "s"}`,
    });

    // Walk the selected nodes one-at-a-time, fabricating believable
    // findings. ~1s per node. Caller (viewer) consumes `onHighlight`
    // to color the node as the agent "completes" it.
    for (let i = 0; i < nodeIds.length; i++) {
      await new Promise((r) => setTimeout(r, 900 + Math.random() * 400));
      const nodeId = nodeIds[i];
      const isRisky = Math.random() < 0.35;
      const note = FINDING_NOTES[Math.floor(Math.random() * FINDING_NOTES.length)];
      const kind: "reviewed" | "risky" = isRisky ? "risky" : "reviewed";

      setAssignments((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                progress: (i + 1) / nodeIds.length,
                findings: [...a.findings, { nodeId, kind, note }],
              }
            : a,
        ),
      );
      onHighlight?.(nodeIds.slice(0, i + 1));
      onAssign?.([nodeId], kind);
    }

    setAssignments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "done", progress: 1 } : a,
      ),
    );
    toast.success(`${agent.name} · done`, {
      description: `${nodeIds.length} node${nodeIds.length === 1 ? "" : "s"} reviewed`,
    });
  };

  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));

  return (
    <div className="flex h-full flex-col">
      {/* Assign section */}
      <div className="border-b border-neutral-100 p-4">
        <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
          <Sparkle size={10} weight="duotone" className="text-accent-magenta" />
          Assign agent
        </div>
        <div className="mb-3 text-[11px] text-neutral-500">
          {selectedIds.size > 0 ? (
            <>
              <span className="font-medium text-neutral-900">
                {selectedIds.size}
              </span>{" "}
              node{selectedIds.size === 1 ? "" : "s"} selected — pick an agent
              to review them.
            </>
          ) : (
            <>Multi-select nodes in the graph (shift-click), then pick an agent.</>
          )}
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {AGENT_ROSTER.map((a) => (
            <button
              key={a.name}
              onClick={() => assign(a)}
              disabled={selectedIds.size === 0}
              className="group flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 text-left transition-all hover:border-accent-magenta/50 hover:bg-accent-magenta/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-neutral-900">
                  {a.name}
                </div>
                <div className="truncate text-[11px] text-neutral-500">
                  {a.role}
                </div>
              </div>
              <Plus
                size={11}
                className="shrink-0 text-neutral-400 transition-colors group-hover:text-accent-magenta"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Active + past assignments */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
          <span>Runs</span>
          {assignments.length > 0 && (
            <span className="text-neutral-400">{assignments.length}</span>
          )}
        </div>
        {assignments.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-200 px-4 py-6 text-center text-[11px] text-neutral-400">
            No runs yet.
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {assignments.map((a) => (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-md border border-neutral-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {a.status === "running" ? (
                        <CausalistSpinner size={11} />
                      ) : (
                        <CheckCircle
                          size={11}
                          weight="fill"
                          className="text-emerald-500"
                        />
                      )}
                      <span className="font-mono text-[11px] font-medium text-neutral-900">
                        {a.agentName}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        · {a.nodeIds.length} node{a.nodeIds.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] tabular-nums text-neutral-400">
                      {Math.round(a.progress * 100)}%
                    </span>
                  </div>

                  {/* progress */}
                  <div className="mt-2 h-px w-full overflow-hidden bg-neutral-100">
                    <motion.div
                      className={cn(
                        "h-full",
                        a.status === "done"
                          ? "bg-emerald-500"
                          : "bg-accent-magenta",
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${a.progress * 100}%` }}
                      transition={{ duration: 0.35, ease: "linear" }}
                    />
                  </div>

                  {a.status === "running" && (
                    <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-accent-magenta">
                      <RotatingVerb
                        verbs={[
                          "Reading",
                          "Tracing",
                          "Cross-checking",
                          "Synthesising",
                        ]}
                      />
                      <span className="text-neutral-400">
                        · {a.agentRole.toLowerCase()}
                      </span>
                    </div>
                  )}

                  {/* Findings */}
                  {a.findings.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {a.findings.slice(-4).map((f, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-[11px]"
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "mt-[3px] shrink-0",
                              f.kind === "risky"
                                ? "text-amber-500"
                                : "text-emerald-500",
                            )}
                          >
                            {f.kind === "risky" ? (
                              <Warning size={9} weight="fill" />
                            ) : (
                              <CheckCircle size={9} weight="fill" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1 text-neutral-600">
                            <span className="font-mono text-neutral-900">
                              {nodesById.get(f.nodeId)?.label ??
                                f.nodeId.slice(0, 24)}
                            </span>
                            <span className="mx-1 text-neutral-300">·</span>
                            <span>{f.note}</span>
                          </span>
                        </li>
                      ))}
                      {a.findings.length > 4 && (
                        <li className="font-mono text-[10px] text-neutral-400">
                          +{a.findings.length - 4} more
                        </li>
                      )}
                    </ul>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
