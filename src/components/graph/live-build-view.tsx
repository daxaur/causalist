"use client";

// LiveBuildView — the demo headliner.
//
// While the analyze pipeline is mid-stream, this view shows a live
// force-graph that grows node-by-node and edge-by-edge as the four
// builder agents emit them over SSE. A slim top strip carries one chip
// per agent (color, pulsing while streaming, with a per-agent
// ModelPill). Bottom carries a status line. When the pipeline lands
// `done`, the parent unmounts this and mounts the standard
// CausalGraphViewer — the layout matches so the transition is quiet.

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { CausalistSpinner } from "@/components/ui/causalist-loader";
import { CheckCircle, Warning } from "@phosphor-icons/react";
import { ModelPill } from "@/components/agents/model-pill";
import { BUILDER_AGENTS, type BuilderAgentId } from "@/lib/analyze/prompts";
import {
  LAYER_COLORS,
  type CausalEdge,
  type CausalNode,
  type SemanticLayer,
} from "@/lib/graph/types";
import { cn } from "@/lib/utils";

// ForceGraph2D ships its own Three.js / canvas weight — keep dynamic.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

export type AgentStatus = "pending" | "running" | "done" | "error";

export interface AgentLiveState {
  id: BuilderAgentId;
  status: AgentStatus;
  count: number;
  message?: string;
}

interface VisNode extends CausalNode {
  /** Frame-local pulse marker — a Date.now() stamp set at emit time. */
  _pulse?: number;
  x?: number;
  y?: number;
}

interface VisEdge extends CausalEdge {
  /** Pulse marker for newly-emitted edges. */
  _pulse?: number;
}

const PULSE_MS = 700;
const ACCENT = "#D24798";
const INK = "#141413";
const CANVAS_BG = "#faf9f5";

interface Props {
  agents: Record<BuilderAgentId, AgentLiveState>;
  models: Record<BuilderAgentId, string>;
  onModelChange: (id: BuilderAgentId, model: string) => void;
  /** Nodes accumulated so far. Caller is responsible for mutating in place
   *  via setState — pass a NEW array reference each time. */
  nodes: VisNode[];
  edges: VisEdge[];
  /** When true, model dropdowns are disabled (run is in flight and we
   *  don't yet support mid-run restart). */
  modelsLocked: boolean;
  /** Optional final message under the bottom strip — shown on error/done. */
  footerNote?: string;
}

export function LiveBuildView({
  agents,
  models,
  onModelChange,
  nodes,
  edges,
  modelsLocked,
  footerNote,
}: Props) {
  // Force a small repaint cadence so pulse rings fade on time even
  // when no new nodes arrive between emits.
  const [, setNow] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow((n) => n + 1), 80);
    return () => clearInterval(t);
  }, []);

  // Container sizing. ForceGraph2D wants explicit width/height.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(
    () => ({
      nodes: nodes as VisNode[],
      links: edges.map((e) => ({ ...e })),
    }),
    [nodes, edges],
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      {/* Top strip — 4 agent chips */}
      <div className="flex shrink-0 items-stretch gap-2 border-b border-neutral-200 bg-neutral-50/60 p-2">
        {BUILDER_AGENTS.map((a) => {
          const live = agents[a.id];
          return (
            <AgentChip
              key={a.id}
              spec={a}
              live={live}
              model={models[a.id]}
              onModel={(m) => onModelChange(a.id, m)}
              modelsLocked={modelsLocked}
            />
          );
        })}
      </div>

      {/* Body — live force graph */}
      <div ref={wrapRef} className="relative flex-1 overflow-hidden">
        {nodes.length === 0 && edges.length === 0 ? (
          <EmptyCanvas />
        ) : (
          size.w > 0 && (
            <ForceGraph2D
              graphData={data}
              width={size.w}
              height={size.h}
              backgroundColor={CANVAS_BG}
              cooldownTicks={Infinity}
              d3AlphaDecay={0.01}
              d3VelocityDecay={0.35}
              nodeRelSize={5}
              linkColor={(l) => {
                const link = l as VisEdge;
                const fresh =
                  link._pulse && Date.now() - link._pulse < PULSE_MS;
                if (fresh) return ACCENT;
                return link.verified === false
                  ? "rgba(120,120,130,0.18)"
                  : "rgba(120,120,130,0.35)";
              }}
              linkWidth={(l) => {
                const link = l as VisEdge;
                const fresh =
                  link._pulse && Date.now() - link._pulse < PULSE_MS;
                return fresh ? 1.6 : 0.6;
              }}
              nodeCanvasObjectMode={() => "replace"}
              nodeCanvasObject={(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                rawNode: any,
                ctx: CanvasRenderingContext2D,
                scale: number,
              ) => {
                const node = rawNode as VisNode;
                if (node.x == null || node.y == null) return;
                const layer = (node.layer ?? "logic") as SemanticLayer;
                const fill = LAYER_COLORS[layer] ?? "#cbd5e1";
                const r = 4.5;
                // Pulse ring while a node is freshly-emitted.
                const pulseAge = node._pulse ? Date.now() - node._pulse : Infinity;
                if (pulseAge < PULSE_MS) {
                  const t = 1 - pulseAge / PULSE_MS;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, r + 8 * (1 - t), 0, Math.PI * 2);
                  ctx.fillStyle = `rgba(210,71,152,${0.35 * t})`;
                  ctx.fill();
                }
                ctx.beginPath();
                ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
                ctx.fillStyle = fill;
                ctx.fill();
                ctx.lineWidth = 1 / scale;
                ctx.strokeStyle = INK;
                ctx.stroke();
              }}
              enableNodeDrag={false}
              enablePanInteraction={false}
              enableZoomInteraction={false}
            />
          )
        )}
      </div>

      {/* Bottom — concise count line */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50/60 px-3 py-1.5 font-mono text-[10.5px] text-neutral-500">
        <div className="flex items-center gap-3">
          {BUILDER_AGENTS.map((a) => {
            const live = agents[a.id];
            const labelByCount: Record<BuilderAgentId, string> = {
              structure: "nodes",
              dependency: "edges",
              semantic: "summaries",
              oracle: "synth",
            };
            return (
              <span key={a.id} className="inline-flex items-center gap-1">
                <span style={{ color: a.color }}>{a.name}</span>
                <span className="tabular-nums">
                  {live.status === "pending"
                    ? "·"
                    : a.id === "oracle"
                      ? live.status === "done"
                        ? "✓"
                        : live.status === "running"
                          ? "…"
                          : "·"
                      : live.count}
                </span>
                <span className="text-neutral-300">{labelByCount[a.id]}</span>
              </span>
            );
          })}
        </div>
        {footerNote && <span className="truncate">{footerNote}</span>}
      </div>
    </div>
  );
}

function AgentChip({
  spec,
  live,
  model,
  onModel,
  modelsLocked,
}: {
  spec: (typeof BUILDER_AGENTS)[number];
  live: AgentLiveState;
  model: string;
  onModel: (m: string) => void;
  modelsLocked: boolean;
}) {
  const isRunning = live.status === "running";
  const isDone = live.status === "done";
  const isError = live.status === "error";
  return (
    <div
      className={cn(
        "flex flex-1 items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 transition-colors",
        isError && "border-red-200 bg-red-50/40",
        isRunning && "border-neutral-300",
        isDone && "border-emerald-200 bg-emerald-50/30",
        !isRunning && !isDone && !isError && "border-neutral-200",
      )}
      style={
        isRunning ? { boxShadow: `inset 3px 0 0 ${spec.color}` } : undefined
      }
      title={spec.description}
    >
      <StatusGlyph status={live.status} color={spec.color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 leading-tight">
          <span className="font-display text-[13px] font-medium text-neutral-900">
            {spec.name}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">
            {spec.role}
          </span>
        </div>
      </div>
      <ModelPill
        size="sm"
        value={model}
        onChange={onModel}
        disabled={modelsLocked && live.status !== "pending"}
      />
    </div>
  );
}

function StatusGlyph({
  status,
  color,
}: {
  status: AgentStatus;
  color: string;
}) {
  if (status === "running") {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center"
        title="streaming"
      >
        <CausalistSpinner size={12} />
      </span>
    );
  }
  if (status === "done") {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
        title="done"
      >
        <CheckCircle size={11} weight="fill" />
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"
        title="error"
      >
        <Warning size={10} weight="fill" />
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center"
      title="pending"
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color, opacity: 0.35 }}
      />
    </span>
  );
}

function EmptyCanvas() {
  return (
    <div className="flex h-full w-full items-center justify-center text-center">
      <div>
        <CausalistSpinner size={28} />
        <p className="mt-3 max-w-xs font-mono text-[11px] uppercase tracking-wider text-neutral-400">
          Agents warming up · graph appears as nodes are emitted
        </p>
      </div>
    </div>
  );
}
