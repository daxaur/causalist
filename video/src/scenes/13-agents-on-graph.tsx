import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, TYPE } from "../lib/tokens";
import { CausalistLogo, easeOutCubic, FadeUp } from "../lib/anim";

/** AgentsOnGraph — the centerpiece, redone clean.
 *
 *  4s @ 30fps = 120 frames. Absolute-centered Causalist logo; four
 *  builder agents arrange around it in a square (NESW); thin edges
 *  trace from each agent to the center one at a time. That's the
 *  whole composition. The earlier 30-node ring was visual chaos —
 *  this is a single calm visual that says "four agents, one graph."
 */

const AGENTS = [
  { name: "Structure", color: "#D24798", angle: -Math.PI / 2 },
  { name: "Dependency", color: "#3B82F6", angle: 0 },
  { name: "Semantic", color: "#F6A623", angle: Math.PI / 2 },
  { name: "Oracle", color: "#10B981", angle: Math.PI },
];

const RADIUS = 280;
const NODE_RADIUS = 18;

export function AgentsOnGraph() {
  const frame = useCurrentFrame();

  return (
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
          // Edge starts at the agent and extends inward toward the
          // center logo. Stop short of both endpoints so the line
          // doesn't visually overlap the disc or the logo glyph.
          const innerStop = 90; // logo radius room
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
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={0.55}
            />
          );
        })}

        {/* Agent dots — appear in sequence, dead-positioned */}
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
                r={NODE_RADIUS * t}
                fill={a.color}
                opacity={t}
              />
              {/* Soft halo behind */}
              <circle
                r={(NODE_RADIUS + 8) * t}
                fill={a.color}
                opacity={0.12 * t}
              />
              <text
                x={0}
                y={NODE_RADIUS + 32}
                textAnchor="middle"
                style={{
                  fontFamily: TYPE.mono,
                  fontSize: 16,
                  fill: COLORS.ink,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  opacity: 0.7 * t,
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
            fontFamily: TYPE.mono,
            fontSize: 16,
            color: COLORS.midGray,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          four agents · one graph
        </p>
      </FadeUp>
    </AbsoluteFill>
  );
}
