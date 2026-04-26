import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CausalistMark, FadeUp, MaskUpText, SettleFrame } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";

/** Scene 1 — COLD OPEN. 5s @ 30fps = 150 frames.
 *  Black → cream fade, Causalist mark pulses in, wordmark reveals. */
export function ColdOpen() {
  const frame = useCurrentFrame();
  const bgFade = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      <AbsoluteFill style={{ backgroundColor: COLORS.cream, opacity: bgFade }} />
      <SettleFrame totalFrames={150}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 48,
          }}
        >
          {/* The mark */}
          <FadeUp startFrame={20} durationFrames={24}>
            <CausalistMark size={140} />
          </FadeUp>

          {/* Wordmark */}
          <MaskUpText startFrame={42} durationFrames={18}>
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

          {/* Subtitle */}
          <FadeUp startFrame={70} durationFrames={20}>
            <div
              style={{
                fontFamily: TYPE.mono,
                fontSize: 18,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: COLORS.midGray,
              }}
            >
              built with claude opus 4.7
            </div>
          </FadeUp>
        </AbsoluteFill>
      </SettleFrame>
    </AbsoluteFill>
  );
}
