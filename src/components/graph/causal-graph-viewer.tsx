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

const ACCENT = "#E838A4";
const ACCENT_HEX = 0xe838a4;
const CANVAS_BG = "#14091A";

const KIND_EDGE_COLOR: Record<string, string> = {
  imports: "rgba(255,255,255,0.45)",
  calls: "rgba(232,56,164,0.85)",
  reads: "rgba(125,211,252,0.75)",
  writes: "rgba(248,113,113,0.75)",
  extends: "rgba(192,132,252,0.75)",
};

const KIND_EDGE_HEX: Record<string, number> = {
  imports: 0xbababa,
  calls: 0xe838a4,
  reads: 0x7dd3fc,
  writes: 0xf87171,
  extends: 0xc084fc,
};

const LAYER_HEX: Record<SemanticLayer, number> = {
  infra: 0x60a5fa,
  data: 0x34d399,
  logic: 0xfbbf24,
  api: 0xf87171,
  ui: 0xc084fc,
  test: 0xe5e7eb,
  config: 0x94a3b8,
};

export function CausalGraphViewer({
  graph,
  highlightedIds,
}: {
  graph: CausalGraph;
  highlightedIds?: string[];
}) {
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selected, setSelected] = useState<CausalNode | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const externalHighlight = useMemo(
    () => new Set(highlightedIds ?? []),
    [highlightedIds],
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const bloomSetupRef = useRef(false);

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

  // Install a UnrealBloomPass on first mount in 3D mode — this is the
  // single biggest visual upgrade. Nodes stop looking like generic
  // three.js spheres and start looking like embers.
  useEffect(() => {
    if (mode !== "3d") return;
    if (bloomSetupRef.current) return;
    let cancelled = false;
    (async () => {
      // small delay so the force-graph has instantiated its composer
      await new Promise((r) => setTimeout(r, 150));
      if (cancelled) return;
      const g = graphRef.current;
      if (!g || typeof g.postProcessingComposer !== "function") return;
      try {
        const THREE = await import("three");
        const { UnrealBloomPass } = await import(
          "three/addons/postprocessing/UnrealBloomPass.js"
        );
        const w = window.innerWidth;
        const h = window.innerHeight;
        const bloom = new UnrealBloomPass(
          new THREE.Vector2(w, h),
          1.35, // strength
          0.85, // radius
          0.12, // threshold
        );
        g.postProcessingComposer().addPass(bloom);
        bloomSetupRef.current = true;
      } catch (err) {
        // addons path might resolve differently in some environments;
        // the viewer still works without bloom.
        console.warn("Bloom pass skipped:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    const t = setTimeout(() => g.zoomToFit?.(500, 80), 300);
    return () => clearTimeout(t);
  }, [mode, graph]);

  // Cinematic fly-to on selection (3D)
  useEffect(() => {
    if (!selected || mode !== "3d") return;
    const g = graphRef.current;
    if (!g || typeof g.cameraPosition !== "function") return;
    const vn = data.nodes.find((n) => n.id === selected.id) as
      | { x?: number; y?: number; z?: number }
      | undefined;
    if (!vn?.x) return;
    const distance = 130;
    const distRatio =
      1 + distance / Math.hypot(vn.x ?? 1, vn.y ?? 1, vn.z ?? 1);
    g.cameraPosition(
      {
        x: (vn.x ?? 0) * distRatio,
        y: (vn.y ?? 0) * distRatio,
        z: (vn.z ?? 0) * distRatio,
      },
      vn,
      1000,
    );
  }, [selected, mode, data.nodes]);

  const layers = Array.from(new Set(graph.nodes.map((n) => n.layer))) as SemanticLayer[];

  const isSelected = (id: string) => selected?.id === id;
  const isHighlighted = (id: string) =>
    hover === id || externalHighlight.has(id);

  // ── Custom Three.js node rendering ──────────────────────────────
  // Returns a mesh with emissive material per layer. Selected nodes
  // get a 270° torus halo — the Arc+Terminus logo motif rendered in
  // the graph itself.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeThreeObject = useMemo(() => {
    return (n: VisNode) => {
      // Heavy import, but ForceGraph3D is already client-only
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const THREE = require("three");
      const group = new THREE.Group();

      const selectedNow = isSelected(n.id);
      const highlightedNow = isHighlighted(n.id);
      const baseHex = selectedNow || highlightedNow
        ? ACCENT_HEX
        : LAYER_HEX[n.layer as SemanticLayer] ?? 0xcccccc;

      const radius = (n.size ?? 4) + (n.kind === "external" ? 1.5 : 0);

      // Core sphere
      const geom = new THREE.SphereGeometry(radius, 20, 20);
      const mat = new THREE.MeshStandardMaterial({
        color: baseHex,
        emissive: baseHex,
        emissiveIntensity: selectedNow ? 1.6 : highlightedNow ? 1.1 : 0.55,
        roughness: 0.35,
        metalness: 0.15,
      });
      const mesh = new THREE.Mesh(geom, mat);
      group.add(mesh);

      // Outer soft halo for hover/selected
      if (selectedNow || highlightedNow) {
        const haloGeom = new THREE.SphereGeometry(radius * 1.7, 20, 20);
        const haloMat = new THREE.MeshBasicMaterial({
          color: ACCENT_HEX,
          transparent: true,
          opacity: selectedNow ? 0.28 : 0.16,
        });
        group.add(new THREE.Mesh(haloGeom, haloMat));
      }

      // Selected: 270° torus arc — the Causalist logo motif as halo
      if (selectedNow) {
        const arcGeom = new THREE.TorusGeometry(
          radius * 2.3,
          0.25,
          8,
          48,
          Math.PI * 1.5, // 270°
        );
        const arcMat = new THREE.MeshBasicMaterial({
          color: ACCENT_HEX,
          transparent: true,
          opacity: 0.95,
        });
        const arc = new THREE.Mesh(arcGeom, arcMat);
        arc.rotation.z = Math.PI / 6;
        group.add(arc);
      }

      return group;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, hover, externalHighlight]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharedProps: any = {
    graphData: data,
    nodeId: "id",
    nodeLabel: (n: VisNode) =>
      n.summary ? `${n.label}\n\n${n.summary}` : n.label,
    nodeVal: (n: VisNode) => (n.size ?? 4) + (n.kind === "external" ? 2 : 0),
    nodeOpacity: 0.95,
    nodeResolution: 20,
    linkColor: (l: GraphLink) => {
      const s = typeof l.source === "string" ? l.source : (l.source as VisNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as VisNode).id;
      if (selected && (selected.id === s || selected.id === t)) {
        return ACCENT;
      }
      if (hover && (hover === s || hover === t)) {
        return "rgba(232,56,164,0.55)";
      }
      return KIND_EDGE_COLOR[l.kind] ?? "rgba(200,200,210,0.12)";
    },
    linkWidth: (l: GraphLink) => {
      const s = typeof l.source === "string" ? l.source : (l.source as VisNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as VisNode).id;
      return selected && (selected.id === s || selected.id === t) ? 2.2 : 0.6;
    },
    linkOpacity: 0.85,
    linkDirectionalParticles: (l: GraphLink) => {
      const s = typeof l.source === "string" ? l.source : (l.source as VisNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as VisNode).id;
      if (!selected) return 0;
      return selected.id === s || selected.id === t ? 4 : 0;
    },
    linkDirectionalParticleSpeed: 0.007,
    linkDirectionalParticleWidth: 1.6,
    linkDirectionalParticleColor: () => ACCENT,
    onNodeClick: (n: VisNode) => setSelected(n),
    onNodeHover: (n: VisNode | null) => setHover(n?.id ?? null),
    onBackgroundClick: () => setSelected(null),
    backgroundColor: CANVAS_BG,
    cooldownTicks: 150,
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-3xl border border-neutral-200/70 bg-[#14091A] text-white shadow-[0_4px_40px_-12px_rgba(20,9,26,0.35)] ring-1 ring-black/5">
      {/* Radial fade so the edges of the canvas don't feel hard */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] rounded-3xl"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 50%, transparent 60%, rgba(255,92,192,0.04) 100%)",
        }}
      />

      {/* File-tree sidebar */}
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-white/5 bg-[#0C0611] transition-all duration-300",
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
              nodeThreeObject={nodeThreeObject}
              nodeThreeObjectExtend={false}
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
                ctx.font = `500 ${size}px ui-sans-serif, system-ui`;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                const sel = selected?.id === node.id;
                const hov = hover === node.id;
                ctx.fillStyle = sel
                  ? ACCENT
                  : hov
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
