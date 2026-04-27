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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGraphKeyboard } from "@/lib/graph/filters";
import { buildFixPrompt } from "@/lib/graph/prompt";
import { RightPanel } from "./right-panel";
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

type GraphLink = {
  source: string;
  target: string;
  kind: string;
  /** Passed through from CausalEdge — verified via AST vs. LLM-inferred. */
  verified?: boolean;
};
type VisNode = CausalNode & { iconUrl: string | null };

// Palette derived from the "editorial light" research: warm off-white
// canvas + cream default nodes + magenta only as an accent + warm-grey
// edges. No more neon-on-black. Matches the rest of the product.
const ACCENT = "#E838A4";
const ACCENT_HEX = 0xe838a4;
const CANVAS_BG = "#FAFAF8";

const INK = "#2A2420"; // primary ink
const NODE_DEFAULT_FILL = 0xede9e3; // warm cream
const NODE_DEFAULT_STROKE = 0x2a2420; // ink hairline
const NODE_LEAF_FILL = 0xffffff;
const NODE_LEAF_STROKE = 0xbdb6ac;
const EDGE_DEFAULT = "rgba(180,170,158,0.60)"; // #D4D0C8 @ 0.6

const KIND_EDGE_COLOR: Record<string, string> = {
  imports: EDGE_DEFAULT,
  calls: "rgba(232,56,164,0.70)",
  reads: "rgba(120,113,108,0.60)",
  writes: "rgba(120,113,108,0.60)",
  extends: "rgba(120,113,108,0.60)",
};

const KIND_EDGE_HEX: Record<string, number> = {
  imports: 0xd4d0c8,
  calls: 0xe838a4,
  reads: 0xb8b1a7,
  writes: 0xb8b1a7,
  extends: 0xb8b1a7,
};

// Soft, desaturated hues — all pass against the #FAFAF8 canvas
// without vibrating, and every one reads as a sibling in the same
// palette family.
const LAYER_HEX: Record<SemanticLayer, number> = {
  infra: 0x8eabc8, // dusty blue
  data: 0x86b6a1, // sage
  logic: 0xcdb586, // wheat
  api: 0xd08a8a, // terracotta
  ui: 0xb199c8, // muted lilac
  test: 0xcccccc, // greige
  config: 0x99928a, // warm taupe
};

export function CausalGraphViewer({
  graph,
  highlightedIds,
  diff,
  visibleIds,
  onAskAboutSelection,
  compact = false,
}: {
  graph: CausalGraph;
  highlightedIds?: string[];
  diff?: DiffOverlay;
  /** If set, nodes NOT in the set are dimmed (not hidden). From filter panel. */
  visibleIds?: Set<string>;
  onAskAboutSelection?: (ids: string[]) => void;
  /** Compact mode (landing-page PreviewDialog) — hide file-tree sidebar,
   * top bar extras, importance stats, keyboard hint strip, legend. */
  compact?: boolean;
}) {
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (compact) return false;
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("causalist:sidebarOpen");
    return stored === null ? true : stored === "1";
  });
  useEffect(() => {
    if (compact) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("causalist:sidebarOpen", sidebarOpen ? "1" : "0");
    }
  }, [sidebarOpen, compact]);
  const [panelManuallyOpen, setPanelManuallyOpen] = useState(false);
  const [panelInitialTab, setPanelInitialTab] = useState<"inspector" | "agent" | null>(null);

  // Cursor-style global shortcuts: ⌘I → inspector, ⌘L → agent chat.
  // ⌘L works even with the panel closed — opens the panel and switches
  // to the agent tab. Shortcuts inside the panel are also wired.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (!cmd) return;
      const target = e.target as HTMLElement | null;
      const inField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        setPanelManuallyOpen(true);
        setPanelInitialTab("agent");
      } else if ((e.key === "i" || e.key === "I") && !inField) {
        e.preventDefault();
        setPanelManuallyOpen(true);
        setPanelInitialTab("inspector");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
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
  const [agentHighlight, setAgentHighlight] = useState<Set<string>>(new Set());
  const externalHighlight = useMemo(
    () => new Set([...(highlightedIds ?? []), ...agentHighlight]),
    [highlightedIds, agentHighlight],
  );
  const focused = focusedId
    ? graph.nodes.find((n) => n.id === focusedId) ?? null
    : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  // Cheap per-frame label collision buckets — Set is cleared whenever
  // we detect a >50ms gap between nodeCanvasObject calls (new frame).
  const labelBucketsRef = useRef<{ ts: number; set: Set<string> }>({
    ts: 0,
    set: new Set(),
  });

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
    // Pre-position each node by layer + a deterministic per-id angle.
    // The simulation then barely needs to nudge anything — no late
    // layer-Y force injection, no flicker. Anchored layouts in 3D:
    //   y-axis: layer stratification (infra at top, config at bottom)
    //   x/z:    deterministic ring per node id, so identical repos
    //           yield identical layouts (no random scatter on remount).
    const layerY: Record<string, number> = {
      infra: -180,
      data: -90,
      logic: 0,
      api: 60,
      ui: 120,
      test: 180,
      config: 240,
    };
    const nodes: VisNode[] = graph.nodes.map((n, i) => {
      // Cheap deterministic angle from id so the same node always
      // lands in the same place across mounts.
      let h = 0;
      for (let k = 0; k < n.id.length; k++) {
        h = (h * 31 + n.id.charCodeAt(k)) | 0;
      }
      const angle = ((h % 1000) / 1000) * Math.PI * 2;
      const radius = 80 + ((i * 7) % 40);
      const y = layerY[n.layer ?? "logic"] ?? 0;
      return {
        ...n,
        iconUrl: iconUrlForLanguage(n.language) ?? iconUrlForPath(n.path),
        x: Math.cos(angle) * radius,
        y,
        z: Math.sin(angle) * radius,
      } as VisNode;
    });
    const links: GraphLink[] = graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      kind: e.kind,
      verified: e.verified,
    }));
    return { nodes, links };
  }, [graph]);

  // Bloom was too loud even at low strength — user feedback. The graph
  // reads as a clean dashboard without it. Selected-node color, size
  // tier, and the 270° arc halo carry the visual weight.

  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    // Compact mode (inside a Dialog) needs more time for the portal
    // to finish layout before zoomToFit can read accurate container
    // dimensions. Bump from 300 → 600ms to avoid mis-centered zoom.
    const delay = compact ? 600 : 300;
    const t = setTimeout(() => g.zoomToFit?.(500, 80), delay);
    return () => clearTimeout(t);
  }, [mode, graph, compact]);

  // Layer stratification is now baked into initial node positions in
  // the `data` useMemo above — no post-mount d3Force injection. The
  // old version added forces 250ms after mount, which caused a late
  // visible swing as nodes snapped to their new y-anchors. Pre-
  // positioning avoids the reheat entirely.

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

      const imp = importance.byId.get(n.id);
      const tier = imp?.tier ?? "leaf";
      // Light-mode rendering rules (from research):
      //  - hot/core nodes: solid magenta, no stroke
      //  - default: cream fill + ink hairline
      //  - leaf (external or low-importance): white fill + grey hairline
      //  - selected: fill stays, stroke becomes magenta 1.5px
      //  - hover: stroke thickens; NEVER dims non-neighbors
      let fillHex: number;
      let strokeHex: number | null;
      if (diffHex !== null) {
        fillHex = diffHex;
        strokeHex = null;
      } else if (selectedNow) {
        fillHex = tier === "hot" ? ACCENT_HEX : (LAYER_HEX[n.layer as SemanticLayer] ?? NODE_DEFAULT_FILL);
        strokeHex = ACCENT_HEX;
      } else if (tier === "hot" || tier === "core") {
        fillHex = ACCENT_HEX;
        strokeHex = null;
      } else if (n.kind === "external") {
        fillHex = NODE_LEAF_FILL;
        strokeHex = NODE_LEAF_STROKE;
      } else {
        // Use layer tint at low saturation as the fill; ink hairline
        fillHex = LAYER_HEX[n.layer as SemanticLayer] ?? NODE_DEFAULT_FILL;
        strokeHex = NODE_DEFAULT_STROKE;
      }

      const tierBoost = tier === "hot" ? 3 : tier === "core" ? 1.5 : 0;
      const radius =
        (n.size ?? 4) + (n.kind === "external" ? 1 : 0) + tierBoost;

      // Focus-mode dimming only; hover leaves alpha alone.
      const inFocusChain = focusChain ? focusChain.has(n.id) : true;
      const inHoverChain = hoverChain ? hoverChain.has(n.id) : false;

      // Core sphere — flat fill, no emissive (no bloom, no glow). On a
      // light canvas the fill alone is enough.
      const geom = new THREE.SphereGeometry(radius, 20, 20);
      const mat = new THREE.MeshLambertMaterial({
        color: fillHex,
        transparent: true,
        opacity: inFocusChain ? 1 : 0.2,
      });
      group.add(new THREE.Mesh(geom, mat));

      // Hairline stroke: render a slightly larger back-face sphere so
      // the edge shows as a dark rim. Thin, architectural.
      if (strokeHex !== null) {
        const strokeGeom = new THREE.SphereGeometry(radius + 0.25, 20, 20);
        const strokeMat = new THREE.MeshBasicMaterial({
          color: strokeHex,
          transparent: true,
          opacity: 0.85,
          side: THREE.BackSide,
        });
        group.add(new THREE.Mesh(strokeGeom, strokeMat));
      }

      // Hover ring — thickened accent stroke, no fill fade.
      if (inHoverChain || highlightedNow) {
        const ringGeom = new THREE.SphereGeometry(radius + 0.6, 22, 22);
        const ringMat = new THREE.MeshBasicMaterial({
          color: ACCENT_HEX,
          transparent: true,
          opacity: 0.35,
          side: THREE.BackSide,
        });
        group.add(new THREE.Mesh(ringGeom, ringMat));
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
    // Hover label = filename only. Summary lives in the Inspector tab —
      // keeping the tooltip short stops mouse-over from blowing up into
      // a multi-line wall of text.
    nodeLabel: (n: VisNode) => n.label,
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
      // AST-unverified edges render with lower opacity so users can
      // tell at a glance what's confirmed vs. LLM-inferred.
      const base = KIND_EDGE_COLOR[l.kind] ?? "rgba(200,200,210,0.12)";
      if (l.verified === false) {
        return base.replace(/,\s*0?\.[0-9]+\)$/, ",0.28)");
      }
      return base;
    },
    linkWidth: (l: GraphLink) => {
      const s = typeof l.source === "string" ? l.source : (l.source as VisNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as VisNode).id;
      if (selectedIds.has(s) || selectedIds.has(t)) return 2.2;
      return l.verified === false ? 0.4 : 0.6;
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
    // Aggressive cooldown so the graph SITS STILL after settling.
    // Small graphs without enough links would drift forever on the
    // defaults. cooldownTicks ~ first cool, alpha decay drops alpha
    // quickly, velocity decay = friction. onEngineStop calls
    // pauseAnimation() so the WebGL renderer stops scheduling rAFs
    // entirely once equilibrium is reached. User interactions still
    // work (clicking a node fires onNodeClick because hit-testing
    // doesn't need an active loop).
    // Pre-warm the simulation off-screen so the user sees a settled
    // graph on first paint instead of nodes whirling into place.
    // warmupTicks runs synchronously before render; cooldownTicks=30
    // keeps a brief animation only if positions need micro-adjusting.
    warmupTicks: 100,
    cooldownTicks: 30,
    cooldownTime: 1500,
    d3AlphaDecay: 0.08,
    d3VelocityDecay: 0.75,
    onEngineStop: () => {
      // Zero out residual velocities AND pin every node at its final
      // position by writing fx/fy/fz. The d3 force engine treats
      // nodes with fx/fy/fz set as immovable — even if the user
      // drags one, the others stay put and the simulation has
      // nothing to relax. This is what kept the demo glitching when
      // the user dragged a node: drag re-energized the engine and
      // every other node would jump.
      try {
        for (const n of (data.nodes as unknown) as Array<{
          x?: number;
          y?: number;
          z?: number;
          vx?: number;
          vy?: number;
          vz?: number;
          fx?: number;
          fy?: number;
          fz?: number;
        }>) {
          n.vx = 0;
          n.vy = 0;
          n.vz = 0;
          if (n.x != null) n.fx = n.x;
          if (n.y != null) n.fy = n.y;
          if (n.z != null) n.fz = n.z;
        }
      } catch {
        // best-effort only
      }
    },
    // Disable drag entirely. With pinned nodes drag would be a no-op
    // anyway; turning it off also kills the cursor change so the UI
    // doesn't suggest an interaction we don't support.
    enableNodeDrag: false,
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
        run: () => {
          download(
            `${slug}.json`,
            "application/json",
            JSON.stringify(graph, null, 2),
          );
          toast.success(`${slug}.json downloaded`, {
            description: `${graph.nodes.length} nodes · ${graph.edges.length} edges`,
          });
        },
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
            toast.warning("Canvas not ready", {
              description: "Zoom in/out once, then try again.",
            });
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
            toast.success(`${slug}.png saved`);
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
            toast.info("Select nodes first", {
              description: "Click a node (shift-click to add more).",
            });
            return;
          }
          const prompt = buildFixPrompt(graph, selectedIds);
          await navigator.clipboard.writeText(prompt);
          toast.success("Prompt copied", {
            description: `${selectedIds.size} node${selectedIds.size === 1 ? "" : "s"} · paste into Claude Code`,
          });
        },
      },
      {
        id: "copy-url",
        label: "Copy this URL",
        hint: "?focus=…",
        run: async () => {
          await navigator.clipboard.writeText(window.location.href);
          toast.success("Link copied");
        },
      },
      {
        id: "create-share",
        label: "Share graph (public link)",
        hint: "/s/…",
        run: async () => {
          const t = toast.loading("Creating share link…");
          try {
            const res = await fetch("/api/share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                graph,
                repo: graph.repo,
                owner: graph.repo.split("/")[0],
                title: graph.repo,
              }),
            });
            const data = (await res.json()) as { id?: string; url?: string; error?: string };
            if (!res.ok || !data.url) {
              toast.error("Share failed", {
                id: t,
                description: data.error ?? "Try again in a moment",
              });
              return;
            }
            await navigator.clipboard.writeText(data.url);
            toast.success("Share link copied", {
              id: t,
              description: data.url,
            });
          } catch (e) {
            toast.error("Share failed", {
              id: t,
              description: e instanceof Error ? e.message : "unknown",
            });
          }
        },
      },
      {
        id: "toggle-focus",
        label: focusMode ? "Exit focus mode" : "Enter focus mode (selection only)",
        hint: ".",
        run: () => {
          if (!focusedId) {
            toast.info("Focus a node first", {
              description: "Click a node to set focus.",
            });
            return;
          }
          setFocusMode((v) => !v);
        },
      },
    ];
  }, [graph, selectedIds, focusMode, focusedId]);

  // Right panel is shown whenever a node is focused, multi-select has entries,
  // or the user has manually opened it. When open, top-right badges and the
  // bottom selection toolbar shift left so they're not hidden behind the 420px panel.
  const panelOpen = !!focused || selectedIds.size > 0 || panelManuallyOpen;
  const rightOverlayOffsetPx = panelOpen ? 436 : 16;

  return (
    <div
      className="relative flex h-full w-full overflow-hidden border border-neutral-200/70 text-[color:var(--ink,#2A2420)]"
      style={{ backgroundColor: CANVAS_BG }}
    >
      {/* Subtle architectural grid — 64px dot matrix at very low
          contrast. Used to feel like "data-viz canvas" not "graph
          paper." Radial mask keeps it dense-center, sparse-edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(42,36,32,0.12) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(circle at 50% 50%, black 0%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, black 0%, transparent 70%)",
          opacity: 0.55,
        }}
      />

      {/* File-tree sidebar — slightly warmer than the canvas so the
          tree reads as a separate surface, not a ghost overlay. */}
      {!compact && (
        <aside
          className={cn(
            "relative z-[2] flex shrink-0 flex-col border-r border-neutral-200 bg-white transition-all duration-300",
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
      )}

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
                const tier = imp?.tier ?? "leaf";
                // Light-mode node rules — match the 3D path.
                let fillColor: string;
                let strokeColor: string;
                if (tier === "hot" || tier === "core") {
                  fillColor = ACCENT;
                  strokeColor = ACCENT;
                } else if (node.kind === "external") {
                  fillColor = "#FFFFFF";
                  strokeColor = "#BDB6AC";
                } else {
                  const layerHex = LAYER_HEX[node.layer as SemanticLayer] ?? 0xede9e3;
                  fillColor = `#${layerHex.toString(16).padStart(6, "0")}`;
                  strokeColor = INK;
                }
                const r =
                  (node.size ?? 5) +
                  (tier === "hot" ? 3 : tier === "core" ? 1.5 : 0) +
                  (foc ? 2 : 0);

                // Dot
                ctx.beginPath();
                ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
                ctx.fillStyle = fillColor;
                ctx.fill();
                // Hairline stroke — thickens on hover / becomes magenta when selected.
                ctx.lineWidth = (sel || foc ? 1.8 : hov || ext ? 1.4 : 1.0) / scale;
                ctx.strokeStyle = sel || foc ? ACCENT : strokeColor;
                ctx.stroke();

                // Label visibility — tight tier rules + an explicit
                // "no labels at low zoom" floor. Hovered/focused/selected
                // always win; everything else gates on tier + scale.
                const tierVisible =
                  (tier === "hot" && scale >= 1.0) ||
                  (tier === "core" && scale >= 1.6) ||
                  scale >= 2.6;
                const forceShow = hov || foc || sel || ext;
                if (!tierVisible && !forceShow) return;
                // Cheap per-frame collision avoidance for leaf-tier
                // labels: bucket by 40px grid; first label in a bucket
                // wins. Hot/core/forced labels skip the check.
                const now = Date.now();
                if (now - labelBucketsRef.current.ts > 50) {
                  labelBucketsRef.current = { ts: now, set: new Set() };
                } else {
                  labelBucketsRef.current.ts = now;
                }
                if (!forceShow && tier !== "hot" && tier !== "core") {
                  const bucketKey = `${Math.round(node.x / 40)}_${Math.round(node.y / 40)}`;
                  if (labelBucketsRef.current.set.has(bucketKey)) return;
                  labelBucketsRef.current.set.add(bucketKey);
                }
                // Font: stable 9–11px, no wild scale-inverse math.
                const fontSize = scale > 1.5 ? 9 : 11;
                ctx.font = `500 ${fontSize}px ui-sans-serif, system-ui`;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                // Truncate to 18 chars + ellipsis so long basenames
                // don't bleed past their pill.
                const rawLabel = (node.label as string) ?? "";
                const label =
                  rawLabel.length > 18 ? rawLabel.slice(0, 17) + "…" : rawLabel;
                const padX = 5;
                const padY = 2.5;
                const w = ctx.measureText(label).width + padX * 2;
                const h = fontSize + padY * 2;
                const ly = node.y + r + 5;
                // Rounded label background
                ctx.fillStyle = foc
                  ? "rgba(232,56,164,0.95)"
                  : "rgba(255,255,255,0.96)";
                ctx.strokeStyle = foc
                  ? "rgba(232,56,164,1)"
                  : hov || sel
                    ? "rgba(42,36,32,0.35)"
                    : "rgba(42,36,32,0.15)";
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
                ctx.fillStyle = foc ? "#ffffff" : INK;
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

        {/* Top overlay — left stack carries chrome (file tree, repo,
            mode, stats); right stack carries the panel toggles. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
          {!compact ? (
            <div className="pointer-events-auto flex flex-col items-start gap-2">
              {/* Row 1 — file-tree toggle + repo pill */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  aria-label="Toggle file tree"
                  aria-pressed={sidebarOpen}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white/80 backdrop-blur transition-colors",
                    sidebarOpen ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-900",
                  )}
                >
                  <SidebarSimple size={14} />
                </button>
                <div className="rounded-md border border-neutral-200 bg-white/80 px-3 py-1.5 font-mono text-xs text-neutral-700 backdrop-blur">
                  {graph.repo}
                  {graph.commit ? (
                    <span className="text-neutral-400">@{graph.commit.slice(0, 7)}</span>
                  ) : null}
                </div>
              </div>

              {/* Row 2 — 3D / 2D + node·edge count */}
              <div className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white/80 p-1 backdrop-blur">
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
                <div className="mx-1 h-4 w-px bg-neutral-200" />
                <div className="flex items-center gap-1.5 px-2 font-mono text-[10px] text-neutral-500">
                  <List size={11} />
                  {graph.nodes.length} · {graph.edges.length}
                </div>
              </div>

              {/* Row 3 — Hot / Core / Leaf importance stats */}
              <ImportanceStats
                summary={importance}
                totalNodes={graph.nodes.length}
              />
            </div>
          ) : (
            // Compact mode (preview dialogs etc.) — just the mode toggle, top-right
            <div className="pointer-events-auto ml-auto flex items-center gap-1 rounded-md border border-neutral-200 bg-white/80 p-1 backdrop-blur">
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
            </div>
          )}

          {!compact && (
            <FirstHotTooltip
              enabled={importance.hotIds.size > 0}
              hotCount={importance.hotIds.size}
            />
          )}

          {/* Persistent panel toggle — proper button at the top-right
              so it's discoverable. ⌘L / ⌘I shortcut chips on hover. */}
          {!compact && !panelOpen && (
            <div className="pointer-events-auto absolute right-4 top-4 z-20 flex items-center gap-1 rounded-md border border-neutral-200 bg-white/95 p-1 shadow-sm backdrop-blur">
              <button
                type="button"
                onClick={() => {
                  setPanelManuallyOpen(true);
                  setPanelInitialTab("inspector");
                }}
                title="Open Inspector (⌘I)"
                className="group inline-flex h-7 items-center gap-1.5 rounded px-2 text-[12px] text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                Inspector
                <kbd className="hidden font-mono text-[9px] text-neutral-400 group-hover:inline">⌘I</kbd>
              </button>
              <span className="h-3 w-px bg-neutral-200" />
              <button
                type="button"
                onClick={() => {
                  setPanelManuallyOpen(true);
                  setPanelInitialTab("agent");
                }}
                title="Open Agents (⌘L)"
                className="group inline-flex h-7 items-center gap-1.5 rounded bg-accent-magenta px-2.5 text-[12px] font-medium text-white transition-colors hover:bg-accent-magenta/90"
              >
                Agents
                <kbd className="hidden font-mono text-[9px] text-white/70 group-hover:inline">⌘L</kbd>
              </button>
            </div>
          )}
        </div>

        {/* Legend — editorial noise; hide in compact */}
        {!compact && (
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
        )}

        {/* Bottom-right "?" pill — opens HelpOverlay. Single discoverable
            affordance instead of the cramped hint strip. Shifts left when
            the right panel is open so it doesn't slide under it. */}
        {!compact && (
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            className="pointer-events-auto absolute bottom-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-neutral-500 shadow-sm backdrop-blur transition-[right,colors] duration-200 hover:border-accent-magenta/40 hover:text-accent-magenta"
            style={{ right: `${rightOverlayOffsetPx}px` }}
          >
            <Keyboard size={14} />
          </button>
        )}

        {/* Selection toolbar — sits well above the mode switcher (which
            lives at fixed bottom-6) and above the node panel footer.
            When the right panel is open, we shift left so it centers
            in the remaining canvas instead of hiding behind the panel. */}
        <div
          className="pointer-events-none absolute bottom-20 z-30 -translate-x-1/2 transition-[left] duration-200"
          style={{ left: panelOpen ? `calc(50% - 210px)` : "50%" }}
        >
          <SelectionToolbar
            graph={graph}
            selectedIds={selectedIds}
            onClear={clearSelection}
            onExplain={() =>
              onAskAboutSelection?.(Array.from(selectedIds))
            }
          />
        </div>

        {/* Side panel — Cursor-style two-tab IDE: Inspector + Agent */}
        {panelOpen && (
          <RightPanel
            graph={graph}
            focusedNode={focused}
            selectedIds={selectedIds}
            importance={importance}
            initialTab={panelInitialTab}
            onSelect={(n) => handleNodeClick(n)}
            onClose={() => {
              setFocusedId(null);
              setSelectedIds(new Set());
              setAgentHighlight(new Set());
              setPanelManuallyOpen(false);
              setPanelInitialTab(null);
            }}
            onHighlightNodes={(ids) => setAgentHighlight(new Set(ids))}
            onAssign={(ids, kind) => {
              if (kind === "risky") {
                toast.warning(`Flagged risky`, {
                  description: `${ids.length} node${ids.length === 1 ? "" : "s"} need attention`,
                });
              } else if (kind === "fixed") {
                toast.success(`Patched`, {
                  description: `${ids.length} node${ids.length === 1 ? "" : "s"} fixed by agent`,
                });
              }
            }}
          />
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
          className="rounded border border-neutral-300 bg-white px-1 py-[1px] text-[9px] text-neutral-700"
        >
          {k}
        </kbd>
      ))}
      <span className="text-neutral-500">{label}</span>
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
        active ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
