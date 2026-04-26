import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CausalistMark, FadeUp, MaskUpText, SettleFrame } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";

/** Scene 10 — CLOSING / CTA. 4s @ 30fps = 120 frames.
 *  Mark, wordmark, three meta lines, then a slow fade-out. */
export function Closing() {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [102, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.cream, opacity: fadeOut }}>
      <SettleFrame totalFrames={120}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
          }}
        >
          <FadeUp startFrame={0} durationFrames={20}>
            <CausalistMark size={120} />
          </FadeUp>

          <MaskUpText startFrame={18} durationFrames={16}>
            <h1
              style={{
                fontFamily: TYPE.display,
                fontSize: 132,
                fontWeight: 500,
                letterSpacing: "-0.04em",
                color: COLORS.ink,
                margin: 0,
                lineHeight: 1,
              }}
            >
              causalist
            </h1>
          </MaskUpText>

          <FadeUp startFrame={42} durationFrames={20}>
            <div
              style={{
                fontFamily: TYPE.mono,
                fontSize: 18,
                color: COLORS.midGray,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <span>causalist.xyz</span>
              <span style={{ color: COLORS.magenta }}>/</span>
              <span>open source</span>
              <span style={{ color: COLORS.magenta }}>/</span>
              <span>MIT</span>
            </div>
          </FadeUp>

          <FadeUp startFrame={62} durationFrames={20}>
            <p
              style={{
                fontFamily: TYPE.body,
                fontSize: 18,
                color: COLORS.midGray,
                margin: 0,
                fontStyle: "italic",
              }}
            >
              Built with Claude Opus 4.7
            </p>
          </FadeUp>
        </AbsoluteFill>
      </SettleFrame>
    </AbsoluteFill>
  );
}
