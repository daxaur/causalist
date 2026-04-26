import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Eyebrow, FadeUp, MaskUpText, SettleFrame } from "../lib/anim";
import { COLORS, TYPE, EASE } from "../lib/tokens";

/** Scene 5 — FOUR AGENTS. 3s @ 30fps = 90 frames.
 *  Four magenta dots stagger in below their labels. */
export function FourAgents() {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.cream }}>
      <SettleFrame totalFrames={90}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 56,
            padding: 80,
          }}
        >
          <FadeUp startFrame={0} durationFrames={12}>
            <Eyebrow>The pipeline</Eyebrow>
          </FadeUp>

          <MaskUpText startFrame={8} durationFrames={16}>
            <h1
              style={{
                fontFamily: TYPE.display,
                fontSize: 84,
                fontWeight: 500,
                letterSpacing: "-0.03em",
                color: COLORS.ink,
                margin: 0,
                lineHeight: 1,
                textAlign: "center",
              }}
            >
              Four agents. In parallel.
            </h1>
          </MaskUpText>

          {/* Agent row */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 80,
              marginTop: 24,
            }}
          >
            <AgentDot label="Structure" startFrame={32} />
            <AgentDot label="Dependency" startFrame={36} />
            <AgentDot label="Semantic" startFrame={40} />
            <AgentDot label="Oracle" startFrame={44} />
          </div>
        </AbsoluteFill>
      </SettleFrame>
    </AbsoluteFill>
  );
}

function AgentDot({ label, startFrame }: { label: string; startFrame: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [startFrame, startFrame + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ty = interpolate(frame, [startFrame, startFrame + 18], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 4),
  });
  // Gentle pulse after entrance
  const after = Math.max(0, frame - (startFrame + 18));
  const pulse = 1 + Math.sin((after / 30) * Math.PI * 2) * 0.05;

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${ty}px)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "9999px",
          backgroundColor: COLORS.magenta,
          boxShadow: `0 0 12px ${COLORS.magenta}66`,
          transform: `scale(${pulse})`,
        }}
      />
      <div
        style={{
          fontFamily: TYPE.mono,
          fontSize: 16,
          color: COLORS.ink,
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
    </div>
  );
}
