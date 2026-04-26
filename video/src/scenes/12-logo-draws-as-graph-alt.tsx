// Logo opener — alt variant. Centered wordmark; below it a single
// horizontal "agents-on-a-line" graph: 4 colored nodes wired together
// with a pulsing magenta edge underline, signalling the four builder
// agents. Pairs cleanly with "see what your code actually means" copy.

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, TYPE } from "../lib/tokens";
import { easeOutCubic, FadeUp } from "../lib/anim";

const AGENTS = [
  { color: "#D24798", label: "Structure" },
  { color: "#3B82F6", label: "Dependency" },
  { color: "#F6A623", label: "Semantic" },
  { color: "#10B981", label: "Oracle" },
];

const SPACING = 240;

export const LogoDrawsAsGraphAlt: React.FC = () => {
  const frame = useCurrentFrame();
  // 5s @ 30fps = 150 frames
  //   0–22  wordmark fades + scales in
  //   22–55 nodes pop in (staggered)
  //   55–95 underline edge sweeps left-to-right
  //   95–150 hold + tagline fades in

  const wordScale = interpolate(frame, [0, 22], [0.94, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOutCubic,
  });
  const wordOpacity = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const edgeProgress = interpolate(frame, [55, 95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOutCubic,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.cream,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 80,
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          fontFamily: TYPE.display,
          fontSize: 156,
          fontWeight: 500,
          letterSpacing: "-0.04em",
          color: COLORS.ink,
          lineHeight: 1,
          opacity: wordOpacity,
          transform: `scale(${wordScale})`,
        }}
      >
        Causalist
      </div>

      {/* Agent graph row */}
      <svg
        width={SPACING * (AGENTS.length - 1) + 200}
        height={120}
        viewBox={`${-(SPACING * (AGENTS.length - 1)) / 2 - 80} -60 ${SPACING * (AGENTS.length - 1) + 160} 120`}
      >
        {/* Connecting line — sweeps in left-to-right */}
        {(() => {
          const totalWidth = SPACING * (AGENTS.length - 1);
          const leftX = -totalWidth / 2;
          const rightX = totalWidth / 2;
          const cur = leftX + (rightX - leftX) * edgeProgress;
          return (
            <line
              x1={leftX}
              y1={0}
              x2={cur}
              y2={0}
              stroke={COLORS.magenta}
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={0.55}
            />
          );
        })()}

        {AGENTS.map((a, i) => {
          const start = 24 + i * 8;
          const t = interpolate(frame, [start, start + 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: easeOutCubic,
          });
          const totalWidth = SPACING * (AGENTS.length - 1);
          const x = -totalWidth / 2 + i * SPACING;
          return (
            <g key={i} transform={`translate(${x} 0) scale(${t})`}>
              <circle r={26} fill={a.color} opacity={0.18} />
              <circle r={16} fill={a.color} />
              <text
                x={0}
                y={48}
                textAnchor="middle"
                style={{
                  fontFamily: TYPE.mono,
                  fontSize: 14,
                  fill: COLORS.ink,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  opacity: 0.7,
                }}
              >
                {a.label}
              </text>
            </g>
          );
        })}
      </svg>

      <FadeUp startFrame={100} durationFrames={20}>
        <div
          style={{
            fontFamily: TYPE.body,
            fontSize: 28,
            color: COLORS.midGray,
            letterSpacing: "-0.005em",
            fontStyle: "italic",
          }}
        >
          See what your code actually means.
        </div>
      </FadeUp>
    </AbsoluteFill>
  );
};
