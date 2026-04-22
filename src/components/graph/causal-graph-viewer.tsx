"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Cube, SquaresFour } from "@phosphor-icons/react";
import {
  LAYER_COLORS,
  LAYER_LABELS,
  type CausalGraph,
  type CausalNode,
  type SemanticLayer,
} from "@/lib/graph/types";
import { iconUrlForLanguage, iconUrlForPath } from "@/lib/graph/devicon";
import { NodePanel } from "./node-panel";
import { LayerLegend } from "./layer-legend";

const ForceGraph3D = dynamic(
  () => import("react-force-graph-3d").then((m) => m.default),
  { ssr: false },
);
const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d").then((m) => m.default),
  { ssr: false },
);

type GraphLink = { source: string; target: string; kind: string };
type VisNode = CausalNode & { iconUrl: string | null };

const KIND_COLOR: Record<string, string> = {
  imports: "#9ca3af",
  calls: "#fbbf24",
  reads: "#60a5fa",
  writes: "#f87171",
  extends: "#c084fc",
};

export function CausalGraphViewer({ graph }: { graph: CausalGraph }) {
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [selected, setSelected] = useState<CausalNode | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  // react-force-graph has loose types — use a ref of any to sidestep lib/react 19 mismatches
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graph3DRef = useRef<any>(null);

  const data = useMemo(() => {
    const nodes: VisNode[] = graph.nodes.map((n) => ({
      ...n,
      iconUrl: iconUrlForLanguage(n.language) ?? iconUrlForPath(n.path),
    }));
    const links: GraphLink[] = graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      kind: e.kind,
    }));
    return { nodes, links };
  }, [graph]);

  useEffect(() => {
    if (mode !== "3d") return;
    const g = graph3DRef.current;
    if (!g) return;
    const t = setTimeout(() => g.zoomToFit?.(400, 80), 250);
    return () => clearTimeout(t);
  }, [mode, graph]);

  const layers = Array.from(new Set(graph.nodes.map((n) => n.layer))) as SemanticLayer[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharedProps: any = {
    graphData: data,
    nodeId: "id",
    nodeLabel: (n: VisNode) =>
      n.summary ? `${n.label}\n${n.summary}` : n.label,
    nodeVal: (n: VisNode) => (n.size ?? 4) + (n.kind === "external" ? 2 : 0),
    nodeColor: (n: VisNode) => LAYER_COLORS[n.layer],
    linkColor: () => "rgba(160,160,170,0.25)",
    linkDirectionalParticles: 2,
    linkDirectionalParticleSpeed: 0.005,
    linkDirectionalParticleWidth: 1.2,
    linkDirectionalParticleColor: (l: GraphLink) =>
      KIND_COLOR[l.kind] ?? "#9ca3af",
    onNodeClick: (n: VisNode) => setSelected(n),
    onNodeHover: (n: VisNode | null) => setHover(n?.id ?? null),
    backgroundColor: "#0a0a0f",
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-neutral-200 bg-[#0a0a0f] shadow-sm">
      <div className="absolute inset-0">
        {mode === "3d" ? (
          <ForceGraph3D
            ref={graph3DRef}
            {...sharedProps}
            showNavInfo={false}
          />
        ) : (
          <ForceGraph2D
            {...sharedProps}
            nodeCanvasObjectMode={() => "after"}
            nodeCanvasObject={(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              node: any,
              ctx: CanvasRenderingContext2D,
              scale: number,
            ) => {
              if (node.x == null || node.y == null) return;
              ctx.font = `${Math.max(10, 12 / scale)}px ui-sans-serif, system-ui`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle =
                hover === node.id ? "#f5f5f5" : "rgba(229,231,235,0.7)";
              ctx.fillText(node.label, node.x, node.y + 6);
            }}
          />
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
        <div className="pointer-events-auto rounded-md border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs text-white/80 backdrop-blur">
          {graph.repo}
          {graph.commit ? (
            <span className="text-white/40">@{graph.commit.slice(0, 7)}</span>
          ) : null}
        </div>
        <div className="pointer-events-auto flex items-center gap-1 rounded-md border border-white/10 bg-black/40 p-1 backdrop-blur">
          <button
            onClick={() => setMode("3d")}
            aria-pressed={mode === "3d"}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${
              mode === "3d"
                ? "bg-white/15 text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Cube size={14} weight={mode === "3d" ? "fill" : "regular"} />
            3D
          </button>
          <button
            onClick={() => setMode("2d")}
            aria-pressed={mode === "2d"}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${
              mode === "2d"
                ? "bg-white/15 text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            <SquaresFour
              size={14}
              weight={mode === "2d" ? "fill" : "regular"}
            />
            2D
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10">
        <div className="pointer-events-auto">
          <LayerLegend
            layers={layers.map((l) => ({
              key: l,
              label: LAYER_LABELS[l],
              color: LAYER_COLORS[l],
            }))}
          />
        </div>
      </div>

      {selected && (
        <div className="absolute right-0 top-0 z-20 h-full w-full max-w-sm">
          <NodePanel node={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}
