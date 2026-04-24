"use client";

import { useMemo } from "react";
import { LAYER_COLORS } from "@/lib/graph/types";
import { rankImportance } from "@/lib/graph/importance";
import type { PreviewMeta } from "@/lib/graph/previews";

/**
 * Static SVG snapshot of a preview graph — for the landing-page hover
 * card. Deterministic layout (no force simulation): cluster by layer
 * on the Y-axis, spread by id-hash on the X-axis. Static, premium,
 * renders in <100ms and never flickers.
 */
export function PreviewMini({
  preview,
  width = 320,
  height = 180,
}: {
  preview: PreviewMeta;
  width?: number;
  height?: number;
}) {
  const { positions, edges, tierById } = useMemo(() => {
    const graph = preview.graph;
    const imp = rankImportance(graph);

    // Discover layers in use, stable order
    const layerOrder = ["infra", "data", "logic", "api", "ui", "test", "config"] as const;
    const usedLayers = layerOrder.filter((l) =>
      graph.nodes.some((n) => n.layer === l),
    );

    // Group nodes by layer
    const byLayer = new Map<string, typeof graph.nodes>();
    for (const n of graph.nodes) {
      const arr = byLayer.get(n.layer) ?? [];
      arr.push(n);
      byLayer.set(n.layer, arr);
    }

    const PADDING = 14;
    const usableH = height - PADDING * 2;
    const usableW = width - PADDING * 2;
    const rowCount = Math.max(1, usedLayers.length);
    const rowH = usableH / rowCount;

    const positions = new Map<string, { x: number; y: number }>();
    usedLayers.forEach((layer, rowIdx) => {
      const nodes = byLayer.get(layer) ?? [];
      if (nodes.length === 0) return;
      const y = PADDING + rowH * (rowIdx + 0.5);
      // Spread nodes across the row. Hash id to keep positions stable.
      nodes.forEach((n, i) => {
        const t = nodes.length === 1 ? 0.5 : i / (nodes.length - 1);
        // Slight per-node jitter from id hash so rows don't look like a ruler
        const jitter = ((hash(n.id) % 10) - 5) * 0.6;
        const x = PADDING + t * usableW + jitter;
        positions.set(n.id, { x, y });
      });
    });

    // Edges between nodes we placed
    const edges = graph.edges
      .map((e) => {
        const a = positions.get(e.source);
        const b = positions.get(e.target);
        if (!a || !b) return null;
        return { a, b, kind: e.kind };
      })
      .filter(Boolean) as { a: { x: number; y: number }; b: { x: number; y: number }; kind: string }[];

    return { positions, edges, tierById: imp.byId };
  }, [preview, width, height]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
      aria-hidden
    >
      <defs>
        <radialGradient id="mini-bg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#FAFAF8" />
          <stop offset="100%" stopColor="#F3F1EC" />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={width} height={height} fill="url(#mini-bg)" />
      {/* edges first so nodes overlay them */}
      <g stroke="#B4AA9E" strokeWidth={0.6} strokeOpacity={0.45}>
        {edges.map((e, i) => (
          <line key={i} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} />
        ))}
      </g>
      <g>
        {preview.graph.nodes.map((n) => {
          const p = positions.get(n.id);
          if (!p) return null;
          const tier = tierById.get(n.id)?.tier ?? "leaf";
          // hot/core → solid magenta; everything else → layer tint + hairline
          const isAccent = tier === "hot" || tier === "core";
          const fill = isAccent
            ? "#E838A4"
            : LAYER_COLORS[n.layer as keyof typeof LAYER_COLORS] ?? "#D4D0C8";
          const r = tier === "hot" ? 3.4 : tier === "core" ? 2.6 : n.kind === "external" ? 1.6 : 2.0;
          return (
            <circle
              key={n.id}
              cx={p.x}
              cy={p.y}
              r={r}
              fill={fill}
              stroke={isAccent ? "none" : "#2A2420"}
              strokeWidth={isAccent ? 0 : 0.5}
              strokeOpacity={0.7}
            />
          );
        })}
      </g>
    </svg>
  );
}

/** Cheap non-crypto hash so node positions stay stable across renders. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
