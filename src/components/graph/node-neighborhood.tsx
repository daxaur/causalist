"use client";

import { useMemo } from "react";
import { LAYER_COLORS, type CausalEdge, type CausalNode } from "@/lib/graph/types";

const ACCENT = "#E838A4";
const W = 300;
const H = 180;
const CENTER_X = W / 2;
const CENTER_Y = H / 2;

interface Positioned {
  node: CausalNode;
  x: number;
  y: number;
  kind: string;
}

/**
 * Inline SVG showing the selected node at center and its direct
 * neighbors arrayed radially. Incoming on the left, outgoing on the
 * right — reading direction matches causality.
 */
export function NodeNeighborhood({
  node,
  allNodes,
  allEdges,
  onSelect,
}: {
  node: CausalNode;
  allNodes: CausalNode[];
  allEdges: CausalEdge[];
  onSelect: (n: CausalNode) => void;
}) {
  const { incoming, outgoing } = useMemo(() => {
    const byId = new Map(allNodes.map((n) => [n.id, n]));
    const incoming: Positioned[] = [];
    const outgoing: Positioned[] = [];
    for (const e of allEdges) {
      if (e.target === node.id && byId.has(e.source)) {
        incoming.push({ node: byId.get(e.source)!, x: 0, y: 0, kind: e.kind });
      } else if (e.source === node.id && byId.has(e.target)) {
        outgoing.push({ node: byId.get(e.target)!, x: 0, y: 0, kind: e.kind });
      }
    }
    return {
      incoming: layoutArc(incoming, "left"),
      outgoing: layoutArc(outgoing, "right"),
    };
  }, [node, allNodes, allEdges]);

  const total = incoming.length + outgoing.length;

  if (total === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center rounded-lg border border-neutral-100 bg-white font-mono text-[10px] text-neutral-400">
        no connections
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[180px] w-full" role="img">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {incoming.map((p, i) => (
          <EdgeCurve
            key={`in-${i}`}
            from={{ x: p.x, y: p.y }}
            to={{ x: CENTER_X, y: CENTER_Y }}
            direction="in"
          />
        ))}
        {outgoing.map((p, i) => (
          <EdgeCurve
            key={`out-${i}`}
            from={{ x: CENTER_X, y: CENTER_Y }}
            to={{ x: p.x, y: p.y }}
            direction="out"
          />
        ))}

        {/* Labels for directions */}
        {incoming.length > 0 && (
          <text
            x={12}
            y={14}
            className="fill-white/30 font-mono"
            fontSize="8"
          >
            DEPENDED ON BY
          </text>
        )}
        {outgoing.length > 0 && (
          <text
            x={W - 12}
            y={14}
            className="fill-white/30 font-mono"
            fontSize="8"
            textAnchor="end"
          >
            DEPENDS ON
          </text>
        )}

        {/* Neighbor nodes */}
        {[...incoming, ...outgoing].map((p, i) => (
          <NeighborDot
            key={`n-${i}`}
            pos={p}
            onSelect={() => onSelect(p.node)}
          />
        ))}

        {/* Center node — filled Claude orange, subtle halo */}
        <g filter="url(#glow)">
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={12}
            fill={ACCENT}
            opacity={0.2}
          />
          <circle cx={CENTER_X} cy={CENTER_Y} r={6} fill={ACCENT} />
        </g>
      </svg>
    </div>
  );
}

function EdgeCurve({
  from,
  to,
  direction,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  direction: "in" | "out";
}) {
  const midX = (from.x + to.x) / 2;
  const curvature = direction === "in" ? -12 : 12;
  const d = `M ${from.x} ${from.y} Q ${midX} ${(from.y + to.y) / 2 + curvature} ${to.x} ${to.y}`;
  return (
    <path
      d={d}
      stroke={ACCENT}
      strokeWidth={0.8}
      strokeOpacity={0.35}
      fill="none"
    />
  );
}

function NeighborDot({
  pos,
  onSelect,
}: {
  pos: Positioned;
  onSelect: () => void;
}) {
  const color = LAYER_COLORS[pos.node.layer];
  return (
    <g
      onClick={onSelect}
      className="cursor-pointer"
      role="button"
      aria-label={pos.node.label}
    >
      <circle cx={pos.x} cy={pos.y} r={10} fill="transparent" />
      <circle cx={pos.x} cy={pos.y} r={3.5} fill={color} opacity={0.95} />
      <title>{`${pos.node.label} (${pos.kind})`}</title>
    </g>
  );
}

/** Lay neighbors out along a vertical line left or right of center. */
function layoutArc(items: Positioned[], side: "left" | "right"): Positioned[] {
  if (items.length === 0) return items;
  // cap at 7 visible to keep it readable
  const visible = items.slice(0, 7);
  const x = side === "left" ? 38 : W - 38;
  const padding = 30;
  const available = H - padding * 2;
  const step =
    visible.length === 1 ? 0 : available / (visible.length - 1);
  return visible.map((p, i) => ({
    ...p,
    x,
    y: visible.length === 1 ? CENTER_Y : padding + step * i,
  }));
}
