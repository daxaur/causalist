"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, Sparkle, WarningCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { CausalistSpinner } from "@/components/ui/causalist-loader";
import { RotatingVerb, ThinkingDotsAccent } from "@/components/ui/thinking";

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

/** Elapsed time since `from` ms. 1-second tick — Claude Code's cadence
 * (the 100ms version felt twitchy). */
function useElapsed(from: number | undefined, stop: number | undefined): string {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!from || stop) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
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
        <div className="mt-1 flex items-center gap-2 text-xs text-neutral-600">
          {running.length > 0 ? (
            <>
              <ThinkingDotsAccent
                label=""
                className="text-[12px]"
              />
              <RotatingVerb
                verbs={["Synthesising", "Linking", "Tracing", "Inferring"]}
                className="font-mono text-[12px] text-accent-magenta"
              />
              <span className="font-mono text-[11px] text-neutral-400">
                · {running.length} agents · esc to cancel
              </span>
            </>
          ) : totalDone === agents.length ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600">
              <CheckCircle size={11} weight="fill" />
              All done
            </span>
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

        {/* Thin linear progress underline — Claude Code calm, no sweep */}
        <div className="relative mt-2 h-px w-full overflow-hidden bg-neutral-100">
          <motion.div
            className={cn(
              "absolute inset-y-0 left-0",
              agent.status === "error"
                ? "bg-red-500"
                : agent.status === "done"
                  ? "bg-emerald-500"
                  : "bg-accent-magenta",
            )}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: "linear" }}
          />
        </div>

        <AnimatePresence mode="popLayout">
          {last && (
            <motion.div
              key={last.ts + last.text}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="mt-2 flex min-w-0 items-start gap-1.5 font-mono text-[12px] text-neutral-800"
            >
              <span
                aria-hidden
                className={cn(
                  "mt-[1px] shrink-0",
                  last.kind === "action"
                    ? "text-accent-magenta"
                    : last.kind === "error"
                      ? "text-red-500"
                      : "text-neutral-400",
                )}
              >
                ●
              </span>
              <span className="truncate">{last.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {lastFinding && lastFinding !== last && (
          <div className="mt-0.5 flex items-start gap-1 truncate font-mono text-[11px] text-neutral-400">
            <span aria-hidden className="shrink-0">
              ⎿
            </span>
            <span className="truncate">{lastFinding.text}</span>
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
  if (status === "running") return <CausalistSpinner size={11} />;
  if (status === "done") {
    return <CheckCircle size={10} weight="fill" className="text-emerald-500" />;
  }
  if (status === "error") {
    return <WarningCircle size={10} weight="fill" className="text-red-500" />;
  }
  return <span className="h-2 w-2 rounded-full border border-neutral-300" />;
}
