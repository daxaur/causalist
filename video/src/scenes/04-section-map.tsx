import { AbsoluteFill } from "remotion";
import { Eyebrow, FadeUp, MaskUpText, SettleFrame } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";

/** Scene 4 — SECTION TITLE: MAP IT. 3s @ 30fps = 90 frames.
 *  Cuts to a screen recording of paste URL → graph spinning up. */
export function SectionMap() {
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
              01 <span style={{ color: COLORS.magenta }}>/</span> map it
            </Eyebrow>
          </FadeUp>

          <MaskUpText startFrame={10} durationFrames={16}>
            <h1
              style={{
                fontFamily: TYPE.display,
                fontSize: 128,
                fontWeight: 500,
                letterSpacing: "-0.04em",
                color: COLORS.ink,
                margin: 0,
                lineHeight: 0.95,
                maxWidth: 1300,
              }}
            >
              From a URL
              <br />
              to a graph.
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
              Paste any GitHub URL. Four Claude Opus 4.7 agents map the
              repository in parallel.
            </p>
          </FadeUp>
        </AbsoluteFill>
      </SettleFrame>
    </AbsoluteFill>
  );
}
