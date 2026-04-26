import { AbsoluteFill } from "remotion";
import { Eyebrow, FadeUp, MaskUpText, SettleFrame } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";

/** Scene 2 — THE PROBLEM. 3s @ 30fps = 90 frames.
 *  Magenta number ("487") inside an otherwise ink headline. */
export function TheProblem() {
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
            <Eyebrow>The problem</Eyebrow>
          </FadeUp>

          <MaskUpText startFrame={10} durationFrames={16}>
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
                maxWidth: 1100,
              }}
            >
              Claude Code grepped{" "}
              <span style={{ color: COLORS.magenta }}>487 files</span>
            </h1>
          </MaskUpText>

          <FadeUp startFrame={32} durationFrames={18}>
            <p
              style={{
                fontFamily: TYPE.mono,
                fontSize: 22,
                color: COLORS.midGray,
                margin: 0,
                letterSpacing: "0.05em",
              }}
            >
              to find <span style={{ color: COLORS.ink }}>3 affected tests</span>.
            </p>
          </FadeUp>
        </AbsoluteFill>
      </SettleFrame>
    </AbsoluteFill>
  );
}
