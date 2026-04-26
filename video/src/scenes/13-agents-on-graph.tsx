import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, TYPE } from "../lib/tokens";
import { CausalistLogo, easeOutCubic, FadeUp } from "../lib/anim";
import { WithFonts } from "../lib/fonts";

/** AgentsOnGraph — 4s @ 30fps = 120 frames. Causalist logo at center,
 *  4 builder agents in a square around it, edges trace inward. */

const AGENTS = [
  { name: "Structure", color: "#D24798", angle: -Math.PI / 2 },
  { name: "Dependency", color: "#3B82F6", angle: 0 },
  { name: "Semantic", color: "#F6A623", angle: Math.PI / 2 },
  { name: "Oracle", color: "#10B981", angle: Math.PI },
];

const RADIUS = 280;
const NODE_RADIUS = 20;

export function AgentsOnGraph() {
  const frame = useCurrentFrame();

  return (
    <WithFonts>
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.cream,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
        }}
      >
        <svg
          width={900}
          height={780}
          viewBox="-450 -390 900 780"
          style={{ overflow: "visible" }}
        >
          {/* Edges from each agent to the center logo, traced one at a time */}
          {AGENTS.map((a, i) => {
            const start = 24 + i * 8;
            const t = interpolate(frame, [start, start + 18], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: easeOutCubic,
            });
            const x2 = Math.cos(a.angle) * RADIUS;
            const y2 = Math.sin(a.angle) * RADIUS;
            const innerStop = 95;
            const outerStop = NODE_RADIUS + 4;
            const startX = (x2 / RADIUS) * (RADIUS - outerStop);
            const startY = (y2 / RADIUS) * (RADIUS - outerStop);
            const endXFinal = (x2 / RADIUS) * innerStop;
            const endYFinal = (y2 / RADIUS) * innerStop;
            const endX = startX + (endXFinal - startX) * t;
            const endY = startY + (endYFinal - startY) * t;
            return (
              <line
                key={`e${i}`}
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={a.color}
                strokeWidth={1.6}
                strokeLinecap="round"
                opacity={0.6}
              />
            );
          })}

          {/* Agent dots + labels */}
          {AGENTS.map((a, i) => {
            const start = 8 + i * 6;
            const t = interpolate(frame, [start, start + 14], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: easeOutCubic,
            });
            const x = Math.cos(a.angle) * RADIUS;
            const y = Math.sin(a.angle) * RADIUS;
            return (
              <g key={`a${i}`} transform={`translate(${x} ${y})`}>
                <circle
                  r={(NODE_RADIUS + 8) * t}
                  fill={a.color}
                  opacity={0.12 * t}
                />
                <circle r={NODE_RADIUS * t} fill={a.color} opacity={t} />
                <text
                  x={0}
                  y={NODE_RADIUS + 36}
                  textAnchor="middle"
                  style={{
                    fontFamily: TYPE.body,
                    fontSize: 22,
                    fontWeight: 500,
                    fill: COLORS.ink,
                    letterSpacing: "-0.01em",
                    opacity: 0.85 * t,
                  }}
                >
                  {a.name}
                </text>
              </g>
            );
          })}

          {/* Center: the actual Causalist logo */}
          <g transform="translate(-90 -90)">
            <foreignObject width={180} height={180}>
              <div
                style={{
                  width: 180,
                  height: 180,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CausalistLogo size={150} startFrame={0} />
              </div>
            </foreignObject>
          </g>
        </svg>

        <FadeUp startFrame={70} durationFrames={20}>
          <p
            style={{
              fontFamily: TYPE.body,
              fontSize: 26,
              fontWeight: 500,
              color: COLORS.midGray,
              margin: 0,
              letterSpacing: "-0.005em",
            }}
          >
            Four agents. One graph.
          </p>
        </FadeUp>
      </AbsoluteFill>
    </WithFonts>
  );
}
