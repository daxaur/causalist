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
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0C0611] font-mono text-sm text-white">
      <header className="border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/40">
          <span className="flex items-center gap-1.5">
            <Sparkle size={10} weight="duotone" className="text-[#E838A4]" />
            Agents
          </span>
          <span>
            {totalDone}/{agents.length}
          </span>
        </div>
        <div className="mt-1 text-xs text-white/70">
          {running.length > 0
            ? `${running.length} working · streaming`
            : totalDone === agents.length
              ? "All done"
              : "Idle"}
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
          "w-full border-b border-white/5 px-4 py-3 text-left transition-colors",
          selected ? "bg-[#E838A4]/8" : "hover:bg-white/5",
        )}
      >
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <StatusDot status={agent.status} />
            <span className="text-white/80">{agent.name}</span>
          </div>
          <span className="tabular-nums text-white/40">{elapsed}</span>
        </div>

        <div className="mt-1.5 h-px w-full bg-white/5">
          <motion.div
            className={cn(
              "h-px",
              agent.status === "error"
                ? "bg-red-400"
                : agent.status === "done"
                  ? "bg-emerald-400"
                  : "bg-[#E838A4]",
            )}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>

        <AnimatePresence mode="popLayout">
          {last && (
            <motion.div
              key={last.ts + last.text}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 truncate text-[12.5px] text-white/90"
            >
              {last.text}
            </motion.div>
          )}
        </AnimatePresence>

        {lastFinding && lastFinding !== last && (
          <div className="mt-0.5 truncate text-[11px] text-white/40">
            └─ {lastFinding.text}
          </div>
        )}

        <div className="mt-1 text-[10px] text-white/30">
          {agent.description}
        </div>
      </button>
    </li>
  );
}

function StatusDot({ status }: { status: AgentStatus }) {
  if (status === "running") {
    return <CircleNotch size={10} className="animate-spin text-[#E838A4]" />;
  }
  if (status === "done") {
    return <CheckCircle size={10} weight="fill" className="text-emerald-400" />;
  }
  if (status === "error") {
    return <WarningCircle size={10} weight="fill" className="text-red-400" />;
  }
  return <span className="h-2 w-2 rounded-full border border-white/20" />;
}
