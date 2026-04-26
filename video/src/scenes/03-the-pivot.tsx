import { AbsoluteFill } from "remotion";
import { FadeUp, MaskUpText } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";

/** Scene 3 — THE PIVOT. 2.5s @ 30fps = 75 frames.
 *  Centered headline. The pivot itself, no slash beats — just the
 *  line breaking the silence after the problem. */
export function ThePivot() {
  return (
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
              fontSize: 116,
              fontWeight: 500,
              letterSpacing: "-0.04em",
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
              fontFamily: TYPE.mono,
              fontSize: 18,
              color: COLORS.midGray,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            give the agent a graph
          </p>
        </FadeUp>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
