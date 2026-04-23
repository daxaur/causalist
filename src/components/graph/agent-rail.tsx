"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle,
  CircleNotch,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type AgentStatus = "running" | "done" | "error" | "pending";

export interface AgentEvent {
  /** ms since epoch */
  ts: number;
  kind: "action" | "finding" | "done" | "error";
  text: string;
}

export interface AgentState {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  startedAt?: number;
  finishedAt?: number;
  /** [done, total] */
  progress: [number, number];
  events: AgentEvent[];
}

/** Elapsed time since `from` ms, ticks every 100ms. */
function useElapsed(from: number | undefined, stop: number | undefined): string {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!from || stop) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [from, stop]);
  if (!from) return "0:00";
  const end = stop ?? now;
  const elapsed = Math.max(0, end - from);
  const s = Math.floor(elapsed / 1000);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

export function AgentRail({
  agents,
  onSelectAgent,
  selectedAgentId,
}: {
  agents: AgentState[];
  onSelectAgent?: (id: string | null) => void;
  selectedAgentId?: string | null;
}) {
  const running = agents.filter((a) => a.status === "running");
  const totalDone = agents.filter((a) => a.status === "done").length;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white font-mono text-sm text-neutral-900 shadow-[0_1px_0_rgba(0,0,0,0.02),0_20px_40px_-24px_rgba(20,9,26,0.15)]">
      <header className="border-b border-neutral-100 px-4 py-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Sparkle size={10} weight="duotone" className="text-accent-magenta" />
            Agents
          </span>
          <span>
            {totalDone}/{agents.length}
          </span>
        </div>
        <div className="mt-1 text-xs text-neutral-600">
          {running.length > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent-magenta opacity-75" />
                <span className="relative rounded-full bg-accent-magenta h-1.5 w-1.5" />
              </span>
              {running.length} working · streaming
            </span>
          ) : totalDone === agents.length ? (
            "All done"
          ) : (
            "Idle"
          )}
        </div>
      </header>
      <ul className="flex-1 overflow-y-auto">
        {agents.map((a) => (
          <AgentRow
            key={a.id}
            agent={a}
            selected={selectedAgentId === a.id}
            onSelect={() =>
              onSelectAgent?.(selectedAgentId === a.id ? null : a.id)
            }
          />
        ))}
      </ul>
    </div>
  );
}

function AgentRow({
  agent,
  selected,
  onSelect,
}: {
  agent: AgentState;
  selected: boolean;
  onSelect: () => void;
}) {
  const elapsed = useElapsed(agent.startedAt, agent.finishedAt);
  const last = agent.events.at(-1);
  const lastFinding = useMemo(
    () => [...agent.events].reverse().find((e) => e.kind === "finding"),
    [agent.events],
  );
  const [done, total] = agent.progress;
  const pct = total === 0 ? 0 : Math.min(100, (done / total) * 100);

  return (
    <li>
      <button
        onClick={onSelect}
        className={cn(
          "w-full border-b border-neutral-100 px-4 py-3 text-left transition-colors",
          selected
            ? "bg-accent-magenta/5"
            : "hover:bg-neutral-50",
        )}
      >
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <StatusDot status={agent.status} />
            <span className="text-neutral-700">{agent.name}</span>
          </div>
          <span className="tabular-nums text-neutral-400">{elapsed}</span>
        </div>

        {/* Track + progress bar — a little thicker so it reads as movement */}
        <div className="relative mt-2 h-[3px] w-full overflow-hidden rounded-full bg-neutral-100">
          <motion.div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              agent.status === "error"
                ? "bg-red-500"
                : agent.status === "done"
                  ? "bg-emerald-500"
                  : "bg-accent-magenta",
            )}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* Shimmer sweep while running */}
          {agent.status === "running" && (
            <motion.div
              aria-hidden
              className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/80 to-transparent"
              animate={{ x: ["-100%", "400%"] }}
              transition={{ duration: 1.6, ease: "linear", repeat: Infinity }}
            />
          )}
        </div>

        <AnimatePresence mode="popLayout">
          {last && (
            <motion.div
              key={last.ts + last.text}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="mt-2 truncate text-[12.5px] text-neutral-800"
            >
              {last.text}
            </motion.div>
          )}
        </AnimatePresence>

        {lastFinding && lastFinding !== last && (
          <div className="mt-0.5 truncate text-[11px] text-neutral-400">
            └─ {lastFinding.text}
          </div>
        )}

        <div className="mt-1 text-[10px] text-neutral-400">
          {agent.description}
        </div>
      </button>
    </li>
  );
}

function StatusDot({ status }: { status: AgentStatus }) {
  if (status === "running") {
    return <CircleNotch size={10} className="animate-spin text-accent-magenta" />;
  }
  if (status === "done") {
    return <CheckCircle size={10} weight="fill" className="text-emerald-500" />;
  }
  if (status === "error") {
    return <WarningCircle size={10} weight="fill" className="text-red-500" />;
  }
  return <span className="h-2 w-2 rounded-full border border-neutral-300" />;
}
