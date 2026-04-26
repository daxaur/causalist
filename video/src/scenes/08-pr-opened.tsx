import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Eyebrow, FadeUp, MaskUpText, SettleFrame } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";

/** Scene 8 — PR OPENED proof card. 3s @ 30fps = 90 frames.
 *  Magenta number for the seconds, soft underline draws under the link. */
export function PrOpened() {
  const frame = useCurrentFrame();
  // Underline draws after the link reveals
  const underline = interpolate(frame, [44, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.cream }}>
      <SettleFrame totalFrames={90}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
            padding: 80,
          }}
        >
          <FadeUp startFrame={0} durationFrames={14}>
            <Eyebrow>The proof</Eyebrow>
          </FadeUp>

          <MaskUpText startFrame={8} durationFrames={16}>
            <h1
              style={{
                fontFamily: TYPE.display,
                fontSize: 96,
                fontWeight: 500,
                letterSpacing: "-0.03em",
                color: COLORS.ink,
                margin: 0,
                lineHeight: 1.05,
                textAlign: "center",
              }}
            >
              PR opened in{" "}
              <span style={{ color: COLORS.magenta }}>47 seconds</span>.
            </h1>
          </MaskUpText>

          <FadeUp startFrame={32} durationFrames={18}>
            <div
              style={{
                position: "relative",
                fontFamily: TYPE.mono,
                fontSize: 22,
                color: COLORS.ink,
              }}
            >
              <span style={{ color: COLORS.magenta }}>→</span>{" "}
              github.com/owner/repo/pull/12
              <div
                style={{
                  position: "absolute",
                  left: 24,
                  right: 0,
                  bottom: -4,
                  height: 1.5,
                  backgroundColor: COLORS.magenta,
                  transformOrigin: "left center",
                  transform: `scaleX(${underline})`,
                }}
              />
            </div>
          </FadeUp>
        </AbsoluteFill>
      </SettleFrame>
    </AbsoluteFill>
  );
}
