import { AbsoluteFill } from "remotion";
import { Eyebrow, FadeUp, MaskUpText, SettleFrame } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";

/** Scene 7 — SECTION TITLE: POINT AGENTS AT IT. 3s.
 *  Cuts to a screen recording of multi-select → plan → SSE stream. */
export function SectionPoint() {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.cream }}>
      <SettleFrame totalFrames={90}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: 28,
            padding: "0 140px",
          }}
        >
          <FadeUp startFrame={0} durationFrames={14}>
            <Eyebrow>
              02 <span style={{ color: COLORS.magenta }}>/</span> point agents at it
            </Eyebrow>
          </FadeUp>

          <MaskUpText startFrame={10} durationFrames={16}>
            <h1
              style={{
                fontFamily: TYPE.display,
                fontSize: 132,
                fontWeight: 500,
                letterSpacing: "-0.04em",
                color: COLORS.ink,
                margin: 0,
                lineHeight: 0.95,
              }}
            >
              Select. Plan.{" "}
              <span style={{ color: COLORS.magenta }}>Ship.</span>
            </h1>
          </MaskUpText>

          <FadeUp startFrame={36} durationFrames={20}>
            <p
              style={{
                fontFamily: TYPE.body,
                fontSize: 26,
                color: COLORS.midGray,
                margin: 0,
                maxWidth: 720,
                lineHeight: 1.4,
              }}
            >
              Multi-select nodes. Tell the agent what to do. It writes a real
              patch and opens a real PR.
            </p>
          </FadeUp>
        </AbsoluteFill>
      </SettleFrame>
    </AbsoluteFill>
  );
}
