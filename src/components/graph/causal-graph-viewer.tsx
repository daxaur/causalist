"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Cube,
  Keyboard,
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
import { rankImportance } from "@/lib/graph/importance";
import {
  DIFF_HEX,
  edgeKey,
  type DiffOverlay,
  type NodeDiffState,
} from "@/lib/graph/diff";
import { cn } from "@/lib/utils";
import { useGraphKeyboard } from "@/lib/graph/filters";
import { buildFixPrompt } from "@/lib/graph/prompt";
import { NodePanel } from "./node-panel";
import { LayerLegend } from "./layer-legend";
import { FileTree } from "./file-tree";
import { SelectionToolbar } from "./selection-toolbar";
import { ImportanceStats } from "./importance-stats";
import { FirstHotTooltip } from "./first-hot-tooltip";
import { HelpOverlay } from "./help-overlay";
import { CommandPalette, type PaletteAction } from "./command-palette";

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
  diff,
  visibleIds,
  onAskAboutSelection,
}: {
  graph: CausalGraph;
  highlightedIds?: string[];
  diff?: DiffOverlay;
  /** If set, nodes NOT in the set are dimmed (not hidden). From filter panel. */
  visibleIds?: Set<string>;
  onAskAboutSelection?: (ids: string[]) => void;
}) {
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Multi-select: Set of selected node ids.
  // The "focused" node (for the detail panel) is the most recently clicked.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const historyRef = useRef<{ stack: string[]; index: number }>({
    stack: [],
    index: -1,
  });
  const externalHighlight = useMemo(
    () => new Set(highlightedIds ?? []),
    [highlightedIds],
  );
  const focused = focusedId
    ? graph.nodes.find((n) => n.id === focusedId) ?? null
    : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  const importance = useMemo(() => rankImportance(graph), [graph]);

  // Precompute neighbor sets for hover-chain dim.
  const neighbors = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const n of graph.nodes) m.set(n.id, new Set([n.id]));
    for (const e of graph.edges) {
      m.get(e.source)?.add(e.target);
      m.get(e.target)?.add(e.source);
    }
    return m;
  }, [graph]);
  const hoverChain = hover ? neighbors.get(hover) ?? null : null;
  const focusChain =
    focusMode && focusedId ? neighbors.get(focusedId) ?? null : null;

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

  // Bloom was too loud even at low strength — user feedback. The graph
  // reads as a clean dashboard without it. Selected-node color, size
  // tier, and the 270° arc halo carry the visual weight.

  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    const t = setTimeout(() => g.zoomToFit?.(500, 80), 300);
    return () => clearTimeout(t);
  }, [mode, graph]);

  // Spatial layering: push each semantic layer toward a different
  // y-anchor so the graph reads top-to-bottom as infra → data → logic
  // → api → ui → test → config. Gives every repo the same shape
  // identity regardless of size. 3D only.
  useEffect(() => {
    if (mode !== "3d") return;
    let cancelled = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 250));
      if (cancelled) return;
      const g = graphRef.current;
      if (!g || typeof g.d3Force !== "function") return;
      const dForce = await import("d3-force-3d");
      const layerY: Record<string, number> = {
        infra: -180,
        data: -90,
        logic: 0,
        api: 60,
        ui: 120,
        test: 180,
        config: 240,
      };
      // Cluster each node toward its layer's y anchor
      g.d3Force(
        "layerY",
        dForce
          .forceY((n: { layer?: string }) => layerY[n.layer ?? "logic"] ?? 0)
          .strength(0.09),
      );
      // Give everything a gentle radial collide so labels don't overlap
      g.d3Force(
        "collide",
        dForce.forceCollide?.((n: { size?: number }) => (n.size ?? 4) + 4),
      );
      g.numDimensions(3);
      // Reheat briefly so the new forces take effect
      if (typeof g.d3ReheatSimulation === "function") g.d3ReheatSimulation();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, graph]);

  // Cinematic fly-to on focus change (3D)
  useEffect(() => {
    if (!focusedId || mode !== "3d") return;
    const g = graphRef.current;
    if (!g || typeof g.cameraPosition !== "function") return;
    const vn = data.nodes.find((n) => n.id === focusedId) as
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
  }, [focusedId, mode, data.nodes]);

  // Importance-ordered walk list: hot first, then core, then the rest.
  const walkOrder = useMemo(() => {
    const rank = (id: string) => {
      const t = importance.byId.get(id)?.tier;
      return t === "hot" ? 0 : t === "core" ? 1 : 2;
    };
    return [...graph.nodes].sort((a, b) => rank(a.id) - rank(b.id)).map((n) => n.id);
  }, [graph.nodes, importance]);

  const selectSingle = (id: string, pushHistory = true) => {
    setSelectedIds(new Set([id]));
    setFocusedId(id);
    if (pushHistory) {
      const h = historyRef.current;
      // Truncate forward history when branching
      h.stack = h.stack.slice(0, h.index + 1);
      if (h.stack[h.stack.length - 1] !== id) {
        h.stack.push(id);
        h.index = h.stack.length - 1;
      }
    }
  };

  const walk = (dir: 1 | -1) => {
    if (walkOrder.length === 0) return;
    const currentIdx = focusedId ? walkOrder.indexOf(focusedId) : -1;
    let nextIdx = currentIdx + dir;
    if (nextIdx < 0) nextIdx = walkOrder.length - 1;
    if (nextIdx >= walkOrder.length) nextIdx = 0;
    selectSingle(walkOrder[nextIdx]);
  };

  useGraphKeyboard({
    onOpenPalette: () => setPaletteOpen(true),
    onHelp: () => setHelpOpen((v) => !v),
    onEscape: () => {
      if (helpOpen) setHelpOpen(false);
      else if (focusMode) setFocusMode(false);
      else if (selectedIds.size > 0 || focusedId) {
        setSelectedIds(new Set());
        setFocusedId(null);
      }
    },
    onFocusToggle: () => {
      if (!focusedId) return;
      setFocusMode((v) => !v);
    },
    onWalkNext: () => walk(1),
    onWalkPrev: () => walk(-1),
    onHistoryBack: () => {
      const h = historyRef.current;
      if (h.index > 0) {
        h.index -= 1;
        const id = h.stack[h.index];
        if (id) selectSingle(id, false);
      }
    },
    onHistoryForward: () => {
      const h = historyRef.current;
      if (h.index < h.stack.length - 1) {
        h.index += 1;
        const id = h.stack[h.index];
        if (id) selectSingle(id, false);
      }
    },
  });

  // ⌘A select all — kept separate from the walk/filter shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        setSelectedIds(new Set(graph.nodes.map((n) => n.id)));
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [graph.nodes]);

  // Read focus/selection from the URL once on mount; write back on change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const focusParam = sp.get("focus");
    const selParam = sp.get("sel");
    if (focusParam && graph.nodes.some((n) => n.id === focusParam)) {
      const sel = selParam
        ? new Set(selParam.split(",").filter(Boolean))
        : new Set([focusParam]);
      setSelectedIds(sel);
      setFocusedId(focusParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (focusedId) sp.set("focus", focusedId);
    else sp.delete("focus");
    if (selectedIds.size > 0) sp.set("sel", Array.from(selectedIds).join(","));
    else sp.delete("sel");
    const qs = sp.toString();
    const target =
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState(null, "", target);
  }, [focusedId, selectedIds]);

  const layers = Array.from(new Set(graph.nodes.map((n) => n.layer))) as SemanticLayer[];

  const isSelected = (id: string) => selectedIds.has(id);
  const isFocused = (id: string) => focusedId === id;
  const isHighlighted = (id: string) =>
    hover === id || externalHighlight.has(id);

  const handleNodeClick = (
    n: { id: string },
    event?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean },
  ) => {
    const additive = event?.shiftKey || event?.metaKey || event?.ctrlKey;
    if (additive) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(n.id)) next.delete(n.id);
        else next.add(n.id);
        return next;
      });
      setFocusedId(n.id);
    } else {
      setSelectedIds(new Set([n.id]));
      setFocusedId(n.id);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setFocusedId(null);
  };

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
      const focusedNow = isFocused(n.id);
      const highlightedNow = isHighlighted(n.id);
      const diffState: NodeDiffState | undefined = diff?.nodes.get(n.id);
      const diffHex =
        diffState === "added"
          ? 0x3fb950
          : diffState === "removed"
            ? 0xf85149
            : diffState === "modified"
              ? 0xd29922
              : null;
      const baseHex =
        diffHex !== null
          ? diffHex
          : selectedNow || highlightedNow
            ? ACCENT_HEX
            : (LAYER_HEX[n.layer as SemanticLayer] ?? 0xcccccc);

      const imp = importance.byId.get(n.id);
      const tierBoost =
        imp?.tier === "hot" ? 2.6 : imp?.tier === "core" ? 1.2 : 0;
      const radius =
        (n.size ?? 4) + (n.kind === "external" ? 1.5 : 0) + tierBoost;

      // Hover never dims. Only explicit focus-mode (. key) dims
      // non-neighbors so the user sees an intentional filter, not
      // mysterious greying on every mouse move. Hovered neighbors get
      // a small emissive bump below instead — brighten, don't dim.
      const inFocusChain = focusChain ? focusChain.has(n.id) : true;
      const inHoverChain = hoverChain ? hoverChain.has(n.id) : false;
      const emissiveBump = focusedNow
        ? 0.4
        : selectedNow
          ? 0.3
          : highlightedNow
            ? 0.25
            : inHoverChain
              ? 0.18
              : 0;

      // Core sphere — flat Lambert material, no bloom needed.
      const geom = new THREE.SphereGeometry(radius, 18, 18);
      const mat = new THREE.MeshLambertMaterial({
        color: baseHex,
        emissive: baseHex,
        emissiveIntensity: emissiveBump,
        transparent: true,
        opacity: inFocusChain ? 1 : 0.25,
      });
      const mesh = new THREE.Mesh(geom, mat);
      group.add(mesh);

      // Soft halo for any active state — full sphere, not an arc —
      // so the node always reads as a closed ring at hover.
      if (focusedNow || selectedNow || highlightedNow) {
        const haloGeom = new THREE.SphereGeometry(radius * 1.55, 22, 22);
        const haloMat = new THREE.MeshBasicMaterial({
          color: ACCENT_HEX,
          transparent: true,
          opacity: focusedNow
            ? 0.22
            : selectedNow
              ? 0.16
              : 0.1,
        });
        group.add(new THREE.Mesh(haloGeom, haloMat));
      }

      // Focused: 270° torus arc — Arc+Terminus logo motif
      if (focusedNow) {
        const arcGeom = new THREE.TorusGeometry(
          radius * 2.3,
          0.25,
          8,
          48,
          Math.PI * 1.5,
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

      // Hot nodes (top 10%) signal importance by size alone — no ring,
      // no extra glow. Keeps the graph readable.

      return group;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, focusedId, hover, externalHighlight, importance]);

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
      // Filter: if either endpoint is filtered out, dim the edge too.
      if (visibleIds && (!visibleIds.has(s) || !visibleIds.has(t))) {
        return "rgba(200,200,210,0.05)";
      }
      if (diff) {
        const state = diff.edges.get(edgeKey(s, t, l.kind));
        if (state === "added") return DIFF_HEX.added;
        if (state === "removed") return DIFF_HEX.removed;
        if (diff.focusMode && state === "unchanged")
          return "rgba(200,200,210,0.08)";
      }
      if (selectedIds.has(s) || selectedIds.has(t)) return ACCENT;
      if (hover && (hover === s || hover === t))
        return "rgba(232,56,164,0.55)";
      return KIND_EDGE_COLOR[l.kind] ?? "rgba(200,200,210,0.12)";
    },
    linkWidth: (l: GraphLink) => {
      const s = typeof l.source === "string" ? l.source : (l.source as VisNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as VisNode).id;
      return selectedIds.has(s) || selectedIds.has(t) ? 2.2 : 0.6;
    },
    linkOpacity: 0.85,
    linkDirectionalParticles: (l: GraphLink) => {
      const s = typeof l.source === "string" ? l.source : (l.source as VisNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as VisNode).id;
      return selectedIds.has(s) || selectedIds.has(t) ? 2 : 0;
    },
    linkDirectionalParticleSpeed: 0.006,
    linkDirectionalParticleWidth: 1.2,
    linkDirectionalParticleColor: () => ACCENT,
    onNodeClick: (
      n: VisNode,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      event?: any,
    ) => handleNodeClick(n, event),
    onNodeHover: (n: VisNode | null) => setHover(n?.id ?? null),
    onBackgroundClick: () => clearSelection(),
    backgroundColor: CANVAS_BG,
    cooldownTicks: 150,
  };

  const paletteActions: PaletteAction[] = useMemo(() => {
    const slug = graph.repo?.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "graph";
    const download = (filename: string, mime: string, content: string) => {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    return [
      {
        id: "export-json",
        label: "Export graph as JSON",
        hint: ".json",
        run: () =>
          download(
            `${slug}.json`,
            "application/json",
            JSON.stringify(graph, null, 2),
          ),
      },
      {
        id: "export-png",
        label: "Export canvas as PNG",
        hint: ".png",
        run: () => {
          const canvas = document.querySelector(
            ".scene-container canvas, canvas",
          ) as HTMLCanvasElement | null;
          if (!canvas) {
            alert("Canvas not ready yet — zoom in/out once, then try again.");
            return;
          }
          canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${slug}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }, "image/png");
        },
      },
      {
        id: "copy-prompt",
        label:
          selectedIds.size > 0
            ? `Copy prompt for ${selectedIds.size} selected node${selectedIds.size === 1 ? "" : "s"}`
            : "Copy prompt (select nodes first)",
        hint: "→ Claude Code",
        run: async () => {
          if (selectedIds.size === 0) {
            alert("Select one or more nodes first (click; shift-click to add).");
            return;
          }
          const prompt = buildFixPrompt(graph, selectedIds);
          await navigator.clipboard.writeText(prompt);
        },
      },
      {
        id: "copy-url",
        label: "Copy shareable URL",
        hint: "?focus=…",
        run: async () => {
          await navigator.clipboard.writeText(window.location.href);
        },
      },
      {
        id: "toggle-focus",
        label: focusMode ? "Exit focus mode" : "Enter focus mode (selection only)",
        hint: ".",
        run: () => {
          if (!focusedId) {
            alert("Focus a node first (click it).");
            return;
          }
          setFocusMode((v) => !v);
        },
      },
    ];
  }, [graph, selectedIds, focusMode, focusedId]);

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
            selectedId={focusedId}
            onSelect={(n) => handleNodeClick(n)}
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
              /* Replace the default circle with our own pill node so
                 labels stop stacking on top of each other, and hit
                 area expands beyond the visible dot. */
              nodeRelSize={6}
              nodeCanvasObjectMode={() => "replace"}
              nodeCanvasObject={(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                node: any,
                ctx: CanvasRenderingContext2D,
                scale: number,
              ) => {
                if (node.x == null || node.y == null) return;
                const id = node.id as string;
                const sel = selectedIds.has(id);
                const foc = focusedId === id;
                const hov = hover === id;
                const ext = externalHighlight.has(id);
                const imp = importance.byId.get(id);
                const layerHex = LAYER_HEX[node.layer as SemanticLayer] ?? 0xcccccc;
                const baseColor =
                  sel || foc || hov || ext
                    ? ACCENT
                    : `#${layerHex.toString(16).padStart(6, "0")}`;
                const r =
                  (node.size ?? 5) +
                  (imp?.tier === "hot" ? 3 : imp?.tier === "core" ? 1.5 : 0) +
                  (foc ? 2 : 0);

                // Outer hover halo — always a full ring so it reads
                // as a single closed circle on hover/selected/focused.
                if (hov || foc || sel || ext) {
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);
                  ctx.fillStyle = foc
                    ? "rgba(232,56,164,0.22)"
                    : sel || ext
                      ? "rgba(232,56,164,0.16)"
                      : "rgba(232,56,164,0.10)";
                  ctx.fill();
                }

                // Dot
                ctx.beginPath();
                ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
                ctx.fillStyle = baseColor;
                ctx.fill();
                // Thin outline for legibility on white
                ctx.lineWidth = 0.9 / scale;
                ctx.strokeStyle = foc
                  ? "rgba(232,56,164,1)"
                  : "rgba(10,10,15,0.45)";
                ctx.stroke();

                // Label logic — tight rules so zooming in doesn't
                // explode into text soup, and hovering always wins:
                // - always for hovered + focused
                // - selected always
                // - hot at scale >= 0.9, core at >= 1.4
                // - anything else only at scale >= 2.2
                const showLabel =
                  hov ||
                  foc ||
                  sel ||
                  (imp?.tier === "hot" && scale >= 0.9) ||
                  (imp?.tier === "core" && scale >= 1.4) ||
                  scale >= 2.2;
                if (!showLabel) return;
                // Font size inverts with zoom so labels stay
                // visually small even when zoomed in — kills the
                // text-soup-at-close-range bug.
                const fontSize = Math.max(9, Math.min(13, 13 / Math.max(1, scale)));
                ctx.font = `500 ${fontSize}px ui-sans-serif, system-ui`;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                const label = node.label as string;
                const padX = 5;
                const padY = 2.5;
                const w = ctx.measureText(label).width + padX * 2;
                const h = fontSize + padY * 2;
                const ly = node.y + r + 5;
                // Rounded label background
                ctx.fillStyle = foc
                  ? "rgba(232,56,164,0.95)"
                  : hov
                    ? "rgba(20,9,26,0.92)"
                    : "rgba(255,255,255,0.95)";
                ctx.strokeStyle = foc
                  ? "rgba(232,56,164,1)"
                  : "rgba(10,10,15,0.18)";
                ctx.lineWidth = 0.8 / scale;
                const lx = node.x - w / 2;
                const radius = h / 2;
                ctx.beginPath();
                ctx.moveTo(lx + radius, ly);
                ctx.arcTo(lx + w, ly, lx + w, ly + h, radius);
                ctx.arcTo(lx + w, ly + h, lx, ly + h, radius);
                ctx.arcTo(lx, ly + h, lx, ly, radius);
                ctx.arcTo(lx, ly, lx + w, ly, radius);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Label text
                ctx.fillStyle = foc
                  ? "#ffffff"
                  : hov
                    ? "#f5f5f5"
                    : "#14091A";
                ctx.fillText(label, node.x, ly + padY);
              }}
              /* Expand click hit area beyond the tiny dot so 2D is
                 actually clickable. */
              nodePointerAreaPaint={(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                node: any,
                color: string,
                ctx: CanvasRenderingContext2D,
              ) => {
                if (node.x == null || node.y == null) return;
                ctx.fillStyle = color;
                const imp = importance.byId.get(node.id);
                const r =
                  (node.size ?? 5) +
                  (imp?.tier === "hot" ? 3 : imp?.tier === "core" ? 1.5 : 0) +
                  8;
                ctx.beginPath();
                ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
                ctx.fill();
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
            <div className="mx-1 h-4 w-px bg-white/10" />
            <button
              onClick={() => setHelpOpen(true)}
              aria-label="Keyboard shortcuts"
              className="flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Keyboard size={11} />
              <kbd className="rounded border border-white/20 px-1 text-[9px]">
                ?
              </kbd>
            </button>
          </div>

          <div className="pointer-events-auto absolute right-4 top-14">
            <ImportanceStats
              summary={importance}
              totalNodes={graph.nodes.length}
            />
          </div>

          <FirstHotTooltip
            enabled={importance.hotIds.size > 0}
            hotCount={importance.hotIds.size}
          />
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

        {/* Always-visible keyboard hint strip — makes the viewer feel
            controllable at a glance without requiring a modal open. */}
        <div className="pointer-events-none absolute bottom-4 right-4 z-10 hidden items-center gap-3 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-[10px] text-white/55 backdrop-blur md:flex">
          <Hint keys={["j", "k"]} label="walk" />
          <span className="text-white/15">·</span>
          <Hint keys={["."]} label="focus" />
          <span className="text-white/15">·</span>
          <Hint keys={["⌘", "K"]} label="cmd" />
          <span className="text-white/15">·</span>
          <Hint keys={["?"]} label="help" />
        </div>

        {/* Selection toolbar — sits well above the mode switcher (which
            lives at fixed bottom-6) and above the node panel footer. */}
        <div className="pointer-events-none absolute bottom-20 left-1/2 z-30 -translate-x-1/2">
          <SelectionToolbar
            graph={graph}
            selectedIds={selectedIds}
            onClear={clearSelection}
            onExplain={() =>
              onAskAboutSelection?.(Array.from(selectedIds))
            }
          />
        </div>

        {/* Side panel */}
        {focused && (
          <div className="absolute right-0 top-0 z-20 h-full w-full max-w-sm">
            <NodePanel
              node={focused}
              allNodes={graph.nodes}
              allEdges={graph.edges}
              importance={importance.byId.get(focused.id)}
              graph={graph}
              onSelect={(n) => handleNodeClick(n)}
              onClose={() => {
                setFocusedId(null);
                setSelectedIds(new Set());
              }}
            />
          </div>
        )}

        {/* Focus mode label */}
        {focusMode && focusedId && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-accent-magenta/40 bg-black/50 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent-magenta backdrop-blur">
            Focus mode · press . to exit
          </div>
        )}

        {/* Help overlay (?) */}
        <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />

        {/* Command palette (⌘K) */}
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          graph={graph}
          onSelectNode={(n) => selectSingle(n.id)}
          actions={paletteActions}
        />
      </div>
    </div>
  );
}

function Hint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="rounded border border-white/15 bg-white/5 px-1 py-[1px] text-[9px] text-white/75"
        >
          {k}
        </kbd>
      ))}
      <span className="text-white/50">{label}</span>
    </span>
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
