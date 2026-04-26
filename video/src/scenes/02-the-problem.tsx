import { AbsoluteFill } from "remotion";
import { FadeUp, MaskUpText } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";
import { WithFonts } from "../lib/fonts";

/** THE PROBLEM. 2.5s @ 30fps = 75 frames.
 *  Single centered headline + Satoshi caption. Captions are now in
 *  Satoshi (matches the app), darker, larger — readable at a glance. */
export function TheProblem() {
  return (
    <WithFonts>
      <AbsoluteFill style={{ backgroundColor: COLORS.cream }}>
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
          <MaskUpText startFrame={4} durationFrames={20}>
            <h1
              style={{
                fontFamily: TYPE.display,
                fontSize: 108,
                fontWeight: 500,
                letterSpacing: "-0.035em",
                color: COLORS.ink,
                margin: 0,
                lineHeight: 1.05,
                textAlign: "center",
                maxWidth: 1300,
              }}
            >
              Claude Code grepped{" "}
              <span style={{ color: COLORS.magenta }}>487 files</span>
            </h1>
          </MaskUpText>

          <FadeUp startFrame={28} durationFrames={20}>
            <p
              style={{
                fontFamily: TYPE.body,
                fontSize: 34,
                fontWeight: 400,
                color: COLORS.midGray,
                margin: 0,
                letterSpacing: "-0.005em",
                textAlign: "center",
              }}
            >
              to find{" "}
              <span style={{ color: COLORS.ink, fontWeight: 500 }}>
                3 affected tests
              </span>
              .
            </p>
          </FadeUp>
        </AbsoluteFill>
      </AbsoluteFill>
    </WithFonts>
  );
}
