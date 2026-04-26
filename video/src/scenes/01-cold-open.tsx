import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CausalistLogo, FadeUp } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";
import { WithFonts } from "../lib/fonts";

/** COLD OPEN. 3.5s @ 30fps = 105 frames.
 *  Black → cream fade. Causalist logo draws itself in the absolute
 *  center; wordmark fades in below. */
export function ColdOpen() {
  const frame = useCurrentFrame();
  const bgFade = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <WithFonts>
      <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
        <AbsoluteFill style={{ backgroundColor: COLORS.cream, opacity: bgFade }} />
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 56,
          }}
        >
          <CausalistLogo size={260} startFrame={14} />

          <FadeUp startFrame={48} durationFrames={20}>
            <h1
              style={{
                fontFamily: TYPE.display,
                fontSize: 132,
                fontWeight: 500,
                letterSpacing: "-0.045em",
                color: COLORS.ink,
                margin: 0,
                lineHeight: 1,
              }}
            >
              causalist
            </h1>
          </FadeUp>
        </AbsoluteFill>
      </AbsoluteFill>
    </WithFonts>
  );
}
