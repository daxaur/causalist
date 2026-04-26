import { AbsoluteFill } from "remotion";
import { FadeUp, MaskUpText } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";
import { WithFonts } from "../lib/fonts";

/** THE PIVOT. 2.5s @ 30fps = 75 frames.
 *  Centered headline + Satoshi tagline. */
export function ThePivot() {
  return (
    <WithFonts>
      <AbsoluteFill style={{ backgroundColor: COLORS.cream }}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 36,
            padding: 80,
          }}
        >
          <MaskUpText startFrame={4} durationFrames={22}>
            <h1
              style={{
                fontFamily: TYPE.display,
                fontSize: 120,
                fontWeight: 500,
                letterSpacing: "-0.045em",
                color: COLORS.ink,
                margin: 0,
                lineHeight: 1,
                textAlign: "center",
              }}
            >
              There&rsquo;s a{" "}
              <span style={{ color: COLORS.magenta }}>faster way.</span>
            </h1>
          </MaskUpText>

          <FadeUp startFrame={32} durationFrames={20}>
            <p
              style={{
                fontFamily: TYPE.body,
                fontSize: 28,
                fontWeight: 500,
                color: COLORS.midGray,
                margin: 0,
                letterSpacing: "-0.005em",
              }}
            >
              Give the agent a graph.
            </p>
          </FadeUp>
        </AbsoluteFill>
      </AbsoluteFill>
    </WithFonts>
  );
}
