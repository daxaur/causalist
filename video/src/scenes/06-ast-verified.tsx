import { AbsoluteFill } from "remotion";
import { CheckmarkDraw, FadeUp, MaskUpText, SettleFrame } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";

/** Scene 6 — AST VERIFIED proof card. 3s @ 30fps = 90 frames.
 *  Big magenta checkmark draws, then the proof line. */
export function AstVerified() {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.cream }}>
      <SettleFrame totalFrames={90}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 36,
          }}
        >
          <CheckmarkDraw startFrame={2} size={220} />

          <MaskUpText startFrame={20} durationFrames={16}>
            <h1
              style={{
                fontFamily: TYPE.display,
                fontSize: 78,
                fontWeight: 500,
                letterSpacing: "-0.03em",
                color: COLORS.ink,
                margin: 0,
                lineHeight: 1.05,
                textAlign: "center",
              }}
            >
              Every edge AST-verified.
            </h1>
          </MaskUpText>

          <FadeUp startFrame={40} durationFrames={20}>
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
              no hallucinated call sites
            </p>
          </FadeUp>
        </AbsoluteFill>
      </SettleFrame>
    </AbsoluteFill>
  );
}
