import { AbsoluteFill } from "remotion";
import { FadeUp, MaskUpText } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";
import { WithFonts } from "../lib/fonts";

/** Scene — AGENTS NEED GRAPHS. 3s @ 30fps = 90 frames.
 *  Pivot from "code is causal" to the value prop: agents (and people)
 *  navigate codebases far better when they can see the graph instead
 *  of grepping a thousand files. Positive frame — never names any
 *  specific tool. */
export function AgentsNeedGraphs() {
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
              Agents work better{" "}
              <span style={{ color: COLORS.magenta }}>with the graph.</span>
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
              Less grep. More signal. Fewer files to read.
            </p>
          </FadeUp>
        </AbsoluteFill>
      </AbsoluteFill>
    </WithFonts>
  );
}
