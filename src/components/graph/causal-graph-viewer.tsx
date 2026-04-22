"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Cube,
  List,
  SidebarSimple,
  SquaresFour,
} from "@phosphor-icons/react";
import {
  LAYER_COLORS,
  LAYER_LABELS,
  type CausalGraph,
  type CausalNode,
  type SemanticLayer,
} from "@/lib/graph/types";
import { iconUrlForLanguage, iconUrlForPath } from "@/lib/graph/devicon";
import { cn } from "@/lib/utils";
import { NodePanel } from "./node-panel";
import { LayerLegend } from "./layer-legend";
import { FileTree } from "./file-tree";

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

const CLAUDE_ORANGE = "#D97757";

const KIND_COLOR: Record<string, string> = {
  imports: "rgba(255,255,255,0.55)",
  calls: "rgba(217,119,87,0.75)",
  reads: "rgba(96,165,250,0.65)",
  writes: "rgba(248,113,113,0.65)",
  extends: "rgba(192,132,252,0.65)",
};

export function CausalGraphViewer({ graph }: { graph: CausalGraph }) {
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selected, setSelected] = useState<CausalNode | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

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
    const g = graphRef.current;
    if (!g) return;
    const t = setTimeout(() => g.zoomToFit?.(400, 80), 300);
    return () => clearTimeout(t);
  }, [mode, graph]);

  // When selection changes, zoom in on that node (3D only)
  useEffect(() => {
    if (!selected || mode !== "3d") return;
    const g = graphRef.current;
    if (!g || typeof g.cameraPosition !== "function") return;
    const vn = data.nodes.find((n) => n.id === selected.id) as
      | { x?: number; y?: number; z?: number }
      | undefined;
    if (!vn?.x) return;
    const distance = 140;
    const distRatio =
      1 +
      distance /
        Math.hypot(vn.x ?? 1, vn.y ?? 1, vn.z ?? 1);
    g.cameraPosition(
      {
        x: (vn.x ?? 0) * distRatio,
        y: (vn.y ?? 0) * distRatio,
        z: (vn.z ?? 0) * distRatio,
      },
      vn,
      1200,
    );
  }, [selected, mode, data.nodes]);

  const layers = Array.from(new Set(graph.nodes.map((n) => n.layer))) as SemanticLayer[];

  const isHighlighted = (n: VisNode) =>
    hover === n.id || selected?.id === n.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharedProps: any = {
    graphData: data,
    nodeId: "id",
    nodeLabel: (n: VisNode) =>
      n.summary ? `${n.label}\n${n.summary}` : n.label,
    nodeVal: (n: VisNode) => (n.size ?? 4) + (n.kind === "external" ? 2 : 0),
    nodeColor: (n: VisNode) =>
      isHighlighted(n) ? CLAUDE_ORANGE : LAYER_COLORS[n.layer],
    nodeOpacity: 0.95,
    linkColor: (l: GraphLink) => {
      const s = typeof l.source === "string" ? l.source : (l.source as VisNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as VisNode).id;
      if (selected && (selected.id === s || selected.id === t)) {
        return CLAUDE_ORANGE;
      }
      return "rgba(200,200,210,0.18)";
    },
    linkWidth: (l: GraphLink) => {
      const s = typeof l.source === "string" ? l.source : (l.source as VisNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as VisNode).id;
      return selected && (selected.id === s || selected.id === t) ? 1.6 : 0.5;
    },
    linkDirectionalParticles: (l: GraphLink) => {
      const s = typeof l.source === "string" ? l.source : (l.source as VisNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as VisNode).id;
      return selected && (selected.id === s || selected.id === t) ? 3 : 1;
    },
    linkDirectionalParticleSpeed: 0.006,
    linkDirectionalParticleWidth: 1.2,
    linkDirectionalParticleColor: (l: GraphLink) =>
      KIND_COLOR[l.kind] ?? "rgba(200,200,210,0.5)",
    onNodeClick: (n: VisNode) => setSelected(n),
    onNodeHover: (n: VisNode | null) => setHover(n?.id ?? null),
    onBackgroundClick: () => setSelected(null),
    backgroundColor: "#0a0a0f",
    cooldownTicks: 120,
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-2xl border border-neutral-200 bg-[#0a0a0f] text-white shadow-sm">
      {/* File-tree sidebar */}
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-white/10 bg-[#07070c] transition-all duration-300",
          sidebarOpen ? "w-64" : "w-0",
        )}
      >
        {sidebarOpen && (
          <FileTree
            nodes={graph.nodes}
            selectedId={selected?.id ?? null}
            onSelect={(n) => setSelected(n)}
          />
        )}
      </aside>

      {/* Main viewer */}
      <div className="relative flex-1">
        <div className="absolute inset-0">
          {mode === "3d" ? (
            <ForceGraph3D
              ref={graphRef}
              {...sharedProps}
              showNavInfo={false}
            />
          ) : (
            <ForceGraph2D
              ref={graphRef}
              {...sharedProps}
              nodeCanvasObjectMode={() => "after"}
              nodeCanvasObject={(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                node: any,
                ctx: CanvasRenderingContext2D,
                scale: number,
              ) => {
                if (node.x == null || node.y == null) return;
                const size = Math.max(10, 11 / scale);
                ctx.font = `${size}px ui-sans-serif, system-ui`;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                const selectedNear = selected?.id === node.id;
                const hovered = hover === node.id;
                ctx.fillStyle = selectedNear
                  ? CLAUDE_ORANGE
                  : hovered
                    ? "#ffffff"
                    : "rgba(229,231,235,0.55)";
                ctx.fillText(node.label, node.x, node.y + 6);
              }}
            />
          )}
        </div>

        {/* Top overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle file tree"
              aria-pressed={sidebarOpen}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-black/40 backdrop-blur transition-colors",
                sidebarOpen ? "text-white" : "text-white/50 hover:text-white",
              )}
            >
              <SidebarSimple size={14} />
            </button>
            <div className="rounded-md border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs text-white/80 backdrop-blur">
              {graph.repo}
              {graph.commit ? (
                <span className="text-white/40">@{graph.commit.slice(0, 7)}</span>
              ) : null}
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-1 rounded-md border border-white/10 bg-black/40 p-1 backdrop-blur">
            <ModeButton
              active={mode === "3d"}
              onClick={() => setMode("3d")}
              label="3D"
              icon={<Cube size={13} weight={mode === "3d" ? "fill" : "regular"} />}
            />
            <ModeButton
              active={mode === "2d"}
              onClick={() => setMode("2d")}
              label="2D"
              icon={<SquaresFour size={13} weight={mode === "2d" ? "fill" : "regular"} />}
            />
            <div className="mx-1 h-4 w-px bg-white/10" />
            <div className="flex items-center gap-1.5 px-2 font-mono text-[10px] text-white/50">
              <List size={11} />
              {graph.nodes.length} · {graph.edges.length}
            </div>
          </div>
        </div>

        {/* Legend */}
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

        {/* Side panel */}
        {selected && (
          <div className="absolute right-0 top-0 z-20 h-full w-full max-w-sm">
            <NodePanel
              node={selected}
              allNodes={graph.nodes}
              allEdges={graph.edges}
              onSelect={(n) => setSelected(n)}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
        active ? "bg-white/15 text-white" : "text-white/60 hover:text-white",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
