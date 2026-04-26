import { AbsoluteFill } from "remotion";
import { FadeUp, MaskUpText } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";

/** Scene 2 — THE PROBLEM. 2.5s @ 30fps = 75 frames.
 *  Single centered headline with a magenta number. No eyebrow, no
 *  settle drift — just the line, dead center. */
export function TheProblem() {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.cream }}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: 80,
        }}
      >
        <MaskUpText startFrame={4} durationFrames={18}>
          <h1
            style={{
              fontFamily: TYPE.display,
              fontSize: 104,
              fontWeight: 500,
              letterSpacing: "-0.03em",
              color: COLORS.ink,
              margin: 0,
              lineHeight: 1.05,
              textAlign: "center",
              maxWidth: 1200,
            }}
          >
            Claude Code grepped{" "}
            <span style={{ color: COLORS.magenta }}>487 files</span>
          </h1>
        </MaskUpText>

        <FadeUp startFrame={28} durationFrames={18}>
          <p
            style={{
              fontFamily: TYPE.mono,
              fontSize: 22,
              color: COLORS.midGray,
              margin: 0,
              letterSpacing: "0.05em",
              textAlign: "center",
            }}
          >
            to find <span style={{ color: COLORS.ink }}>3 affected tests</span>.
          </p>
        </FadeUp>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
