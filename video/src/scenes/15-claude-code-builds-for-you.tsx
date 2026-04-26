import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, TYPE } from "../lib/tokens";
import { CausalistLogo, easeOutCubic, FadeUp, MaskUpText } from "../lib/anim";

/** Claude Code <-> Causalist cut. 3.5s @ 30fps = 105 frames.
 *  Centered. Two logos side by side connected by a thin magenta edge
 *  that traces in. Headline beneath. No pill chips, no MCP tool list
 *  — judges don't read tool names off a 3-second cut anyway. */
export function ClaudeCodeBuildsForYou() {
  const frame = useCurrentFrame();
  const edge = interpolate(frame, [12, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOutCubic,
  });
  const claudeIn = interpolate(frame, [0, 16], [0, 1], {
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
        gap: 56,
      }}
    >
      {/* Logo pair */}
      <svg width={780} height={220} viewBox="-390 -110 780 220">
        {/* Connector line */}
        <line
          x1={-150}
          y1={0}
          x2={-150 + 300 * edge}
          y2={0}
          stroke={COLORS.magenta}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.55}
        />

        {/* Claude wordmark mark on the left — uses the public asset */}
        <g
          transform={`translate(-260 -80) scale(${claudeIn})`}
          opacity={claudeIn}
          style={{ transformOrigin: "left top" }}
        >
          <foreignObject width={220} height={160}>
            <div
              style={{
                width: 220,
                height: 160,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/claude-mark.svg"
                alt="Claude"
                style={{
                  width: 110,
                  height: 110,
                  filter:
                    "invert(34%) sepia(93%) saturate(2200%) hue-rotate(298deg) brightness(96%) contrast(94%)",
                }}
              />
            </div>
          </foreignObject>
        </g>

        {/* Causalist logo on the right */}
        <g transform="translate(40 -80)">
          <foreignObject width={220} height={160}>
            <div
              style={{
                width: 220,
                height: 160,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CausalistLogo size={140} startFrame={20} />
            </div>
          </foreignObject>
        </g>
      </svg>

      {/* Headline */}
      <MaskUpText startFrame={36} durationFrames={20}>
        <h1
          style={{
            fontFamily: TYPE.display,
            fontSize: 96,
            fontWeight: 500,
            letterSpacing: "-0.04em",
            color: COLORS.ink,
            lineHeight: 1.05,
            textAlign: "center",
            maxWidth: 1300,
            margin: 0,
          }}
        >
          Connect Claude Code,{" "}
          <span style={{ color: COLORS.magenta }}>let it build for you.</span>
        </h1>
      </MaskUpText>

      <FadeUp startFrame={64} durationFrames={20}>
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
          mcp · cli · 11 graph-aware tools
        </p>
      </FadeUp>
    </AbsoluteFill>
  );
}
