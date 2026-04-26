import { AbsoluteFill } from "remotion";
import { FadeUp, MaskUpText } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";
import { WithFonts } from "../lib/fonts";

/** Scene — CODE IS CAUSAL. 3s @ 30fps = 90 frames.
 *  Positive opening thesis. Sets up causality as the natural shape of
 *  software, no contrast with any specific tool — the next scene turns
 *  this observation into the value prop for agents. */
export function CodeIsCausal() {
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
                lineHeight: 1.05,
                textAlign: "center",
                maxWidth: 1500,
              }}
            >
              Every codebase is a{" "}
              <span style={{ color: COLORS.magenta }}>graph.</span>
            </h1>
          </MaskUpText>

          <FadeUp startFrame={36} durationFrames={20}>
            <p
              style={{
                fontFamily: TYPE.body,
                fontSize: 32,
                fontWeight: 400,
                color: COLORS.midGray,
                margin: 0,
                letterSpacing: "-0.005em",
                textAlign: "center",
              }}
            >
              Files depend on files. Changes ripple.
            </p>
          </FadeUp>
        </AbsoluteFill>
      </AbsoluteFill>
    </WithFonts>
  );
}
