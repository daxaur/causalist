// Logo opener — the Causalist mark assembles itself as a tiny causal
// graph (3 magenta nodes + connecting edges drawn one at a time),
// then resolves into the wordmark to its right. Sets the thesis in
// 5 seconds without a single word: "this brand IS a graph."

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, TYPE } from "../lib/tokens";
import { easeOutCubic, FadeUp } from "../lib/anim";

const NODES: Array<[number, number]> = [
  [-58, -34], // upper-left
  [58, -34], // upper-right
  [0, 56], // bottom
];

const EDGES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [0, 2],
];

export const LogoDrawsAsGraph: React.FC = () => {
  const frame = useCurrentFrame();

  // Scene timing (5s @ 30fps = 150f):
  //   0–18    nodes pop in (staggered)
  //   18–60   edges trace in (staggered)
  //   60–80   wordmark fades in
  //   80–150  hold + slow settle

  const nodeAt = (i: number) => {
    const start = 4 + i * 6;
    return interpolate(frame, [start, start + 12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: easeOutCubic,
    });
  };

  const edgeAt = (i: number) => {
    const start = 24 + i * 10;
    return interpolate(frame, [start, start + 18], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: easeOutCubic,
    });
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 56,
        }}
      >
        {/* The graph mark */}
        <svg width={240} height={240} viewBox="-120 -120 240 240">
          {EDGES.map(([a, b], i) => {
            const t = edgeAt(i);
            const [x1, y1] = NODES[a];
            const [x2, y2] = NODES[b];
            const dx = x2 - x1;
            const dy = y2 - y1;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x1 + dx * t}
                y2={y1 + dy * t}
                stroke={COLORS.magenta}
                strokeWidth={2.5}
                strokeLinecap="round"
                opacity={0.85}
              />
            );
          })}
          {NODES.map(([x, y], i) => {
            const t = nodeAt(i);
            return (
              <g key={i} transform={`translate(${x} ${y}) scale(${t})`}>
                <circle r={18} fill={COLORS.magenta} opacity={0.18} />
                <circle r={11} fill={COLORS.magenta} />
              </g>
            );
          })}
        </svg>

        {/* The wordmark */}
        <FadeUp startFrame={60} durationFrames={20}>
          <div
            style={{
              fontFamily: TYPE.display,
              fontSize: 132,
              fontWeight: 500,
              letterSpacing: "-0.04em",
              color: COLORS.ink,
              lineHeight: 1,
            }}
          >
            Causalist
          </div>
        </FadeUp>
      </div>
    </AbsoluteFill>
  );
};
