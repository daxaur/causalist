// Big headline cut. The thesis in three lines: "Bringing causality
// closer to agents." Subtle subtitle. Quiet text reveals — no motion
// theater here, the message does the work.

import { AbsoluteFill } from "remotion";
import { COLORS, TYPE } from "../lib/tokens";
import { Eyebrow, FadeUp, MaskUpText } from "../lib/anim";

export const BringingCausalityToAgents: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.cream,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingLeft: 180,
        paddingRight: 180,
        gap: 28,
      }}
    >
      <FadeUp startFrame={4} durationFrames={14}>
        <Eyebrow>02 / why</Eyebrow>
      </FadeUp>

      <MaskUpText startFrame={14} durationFrames={22}>
        <div
          style={{
            fontFamily: TYPE.display,
            fontSize: 144,
            fontWeight: 500,
            letterSpacing: "-0.04em",
            color: COLORS.ink,
            lineHeight: 1.02,
            maxWidth: 1500,
          }}
        >
          Bringing causality{" "}
          <span style={{ color: COLORS.magenta }}>closer to agents.</span>
        </div>
      </MaskUpText>

      <FadeUp startFrame={50} durationFrames={20}>
        <div
          style={{
            fontFamily: TYPE.body,
            fontSize: 38,
            color: COLORS.midGray,
            letterSpacing: "-0.005em",
            lineHeight: 1.4,
            maxWidth: 1100,
            fontStyle: "italic",
          }}
        >
          Make any repo legible — in graph form — for the model that&rsquo;s
          about to change it.
        </div>
      </FadeUp>
    </AbsoluteFill>
  );
};
