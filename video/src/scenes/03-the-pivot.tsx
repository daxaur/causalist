import { AbsoluteFill } from "remotion";
import { FadeUp, MaskUpText, SettleFrame, SlashBeat } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";

/** Scene 3 — THE PIVOT. 3s @ 30fps = 90 frames.
 *  Magenta forward-slash beats in, then headline reveals. */
export function ThePivot() {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.cream }}>
      <SettleFrame totalFrames={90}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
          }}
        >
          <SlashBeat startFrame={2} size={140} />

          <MaskUpText startFrame={20} durationFrames={16}>
            <h1
              style={{
                fontFamily: TYPE.display,
                fontSize: 110,
                fontWeight: 500,
                letterSpacing: "-0.04em",
                color: COLORS.ink,
                margin: 0,
                lineHeight: 1,
                textAlign: "center",
              }}
            >
              There&rsquo;s a faster way.
            </h1>
          </MaskUpText>

          <FadeUp startFrame={42} durationFrames={20}>
            <p
              style={{
                fontFamily: TYPE.mono,
                fontSize: 18,
                color: COLORS.midGray,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              give the agent a graph
            </p>
          </FadeUp>
        </AbsoluteFill>
      </SettleFrame>
    </AbsoluteFill>
  );
}
