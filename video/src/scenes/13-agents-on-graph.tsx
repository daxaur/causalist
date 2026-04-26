// AgentsOnGraph — the visual centerpiece. A static-canvas force graph
// mock: ~30 nodes ring up around a center; then 4 colored agents
// (Structure / Dependency / Semantic / Oracle) appear and "drop"
// nodes + trace edges in their respective colors. The choreographed
// version of the live-build view, sized for video.

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, TYPE } from "../lib/tokens";
import { easeOutCubic } from "../lib/anim";

const NODE_COUNT = 30;
const RING_RADIUS = 280;

// Pseudo-random scatter so the ring doesn't read as a perfect circle.
function nodePos(i: number): [number, number] {
  const angle = (i / NODE_COUNT) * Math.PI * 2 - Math.PI / 2;
  const wobble = (((i * 9301 + 49297) % 233280) / 233280) * 60 - 30;
  const r = RING_RADIUS + wobble;
  return [Math.cos(angle) * r, Math.sin(angle) * r];
}

const AGENTS = [
  { color: "#D24798", name: "Structure", angle: -Math.PI / 2 - 0.3 },
  { color: "#3B82F6", name: "Dependency", angle: -0.1 },
  { color: "#F6A623", name: "Semantic", angle: Math.PI / 2 + 0.2 },
  { color: "#10B981", name: "Oracle", angle: Math.PI - 0.3 },
];

const AGENT_RADIUS = 460;

// Each agent claims a quarter of the ring's nodes (round-robin).
function agentForNode(i: number): number {
  return i % AGENTS.length;
}

// Edges to draw — each connects two ring nodes; the agent that
// "owns" the source node draws it in their color.
const EDGES: Array<[number, number]> = (() => {
  const edges: Array<[number, number]> = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    edges.push([i, (i + 1) % NODE_COUNT]);
    if (i % 4 === 0) edges.push([i, (i + 7) % NODE_COUNT]);
  }
  return edges;
})();

export const AgentsOnGraph: React.FC = () => {
  const frame = useCurrentFrame();
  // 6s @ 30fps = 180 frames
  //   0–24    agents materialize on the canvas
  //   24–110  nodes drop in (4 streams in parallel)
  //   60–160  edges trace in (per-agent color)
  //   140–180 hold

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={1200}
        height={1000}
        viewBox="-600 -500 1200 1000"
      >
        {/* Edges — drawn beneath nodes */}
        {EDGES.map(([a, b], i) => {
          const owner = agentForNode(a);
          const start = 60 + i * 1.6;
          const t = interpolate(frame, [start, start + 18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: easeOutCubic,
          });
          const [x1, y1] = nodePos(a);
          const [x2, y2] = nodePos(b);
          const dx = x2 - x1;
          const dy = y2 - y1;
          return (
            <line
              key={`e${i}`}
              x1={x1}
              y1={y1}
              x2={x1 + dx * t}
              y2={y1 + dy * t}
              stroke={AGENTS[owner].color}
              strokeWidth={1.2}
              strokeLinecap="round"
              opacity={0.42}
            />
          );
        })}

        {/* Ring nodes — "dropped" by their owning agent */}
        {Array.from({ length: NODE_COUNT }, (_, i) => {
          const owner = agentForNode(i);
          const start = 24 + i * 2.6;
          const t = interpolate(frame, [start, start + 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: easeOutCubic,
          });
          const [nx, ny] = nodePos(i);
          // Travel from agent to node — visualizes the "drop."
          const ax = Math.cos(AGENTS[owner].angle) * AGENT_RADIUS;
          const ay = Math.sin(AGENTS[owner].angle) * AGENT_RADIUS;
          const x = ax + (nx - ax) * t;
          const y = ay + (ny - ay) * t;
          // Pulse for ~10 frames after landing.
          const pulseFrame = start + 14;
          const pulse = interpolate(
            frame,
            [pulseFrame, pulseFrame + 10],
            [1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return (
            <g key={`n${i}`} transform={`translate(${x} ${y})`}>
              {pulse > 0 && (
                <circle r={14 * (1 + (1 - pulse))} fill={AGENTS[owner].color} opacity={0.18 * pulse} />
              )}
              <circle
                r={5.5 * t}
                fill={AGENTS[owner].color}
                opacity={t}
              />
            </g>
          );
        })}

        {/* Agent avatars — sit at the corners around the ring */}
        {AGENTS.map((a, i) => {
          const start = i * 5;
          const t = interpolate(frame, [start, start + 18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: easeOutCubic,
          });
          const x = Math.cos(a.angle) * AGENT_RADIUS;
          const y = Math.sin(a.angle) * AGENT_RADIUS;
          // Soft pulse while "working" (between frames 30–150).
          const working = frame > 30 && frame < 150;
          const ringScale = working
            ? 1 + ((frame - 30) % 30) / 30
            : 1;
          const ringOpacity = working
            ? 1 - (((frame - 30) % 30) / 30)
            : 0;
          return (
            <g key={`a${i}`} transform={`translate(${x} ${y}) scale(${t})`}>
              <circle
                r={32}
                fill="none"
                stroke={a.color}
                strokeWidth={1}
                opacity={ringOpacity * 0.6}
                style={{ transform: `scale(${ringScale})`, transformOrigin: "center" }}
              />
              <circle r={26} fill={a.color} opacity={0.16} />
              <circle r={18} fill={a.color} />
              <text
                x={0}
                y={56}
                textAnchor="middle"
                style={{
                  fontFamily: TYPE.mono,
                  fontSize: 14,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fill: COLORS.ink,
                  opacity: 0.7,
                }}
              >
                {a.name}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
