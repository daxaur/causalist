import { AbsoluteFill } from "remotion";
import { COLORS, TYPE } from "../lib/tokens";
import { FadeUp, MaskUpText } from "../lib/anim";

/** Scene — the thesis. 3s @ 30fps = 90 frames.
 *  Single centered headline + one-line italic subtitle. No eyebrow,
 *  no left-padding — just the message, dead center. */
export function BringingCausalityToAgents() {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.cream,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
        padding: 80,
      }}
    >
      <MaskUpText startFrame={4} durationFrames={20}>
        <h1
          style={{
            fontFamily: TYPE.display,
            fontSize: 116,
            fontWeight: 500,
            letterSpacing: "-0.04em",
            color: COLORS.ink,
            lineHeight: 1.05,
            textAlign: "center",
            maxWidth: 1500,
            margin: 0,
          }}
        >
          Bringing causality{" "}
          <span style={{ color: COLORS.magenta }}>closer to agents.</span>
        </h1>
      </MaskUpText>

      <FadeUp startFrame={36} durationFrames={20}>
        <p
          style={{
            fontFamily: TYPE.body,
            fontSize: 28,
            color: COLORS.midGray,
            letterSpacing: "-0.005em",
            lineHeight: 1.4,
            maxWidth: 980,
            fontStyle: "italic",
            textAlign: "center",
            margin: 0,
          }}
        >
          Make any repo legible — in graph form — for the model that&rsquo;s about
          to change it.
        </p>
      </FadeUp>
    </AbsoluteFill>
  );
}
