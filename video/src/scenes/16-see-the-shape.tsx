import { AbsoluteFill } from "remotion";
import { COLORS, TYPE } from "../lib/tokens";
import { FadeUp, MaskUpText } from "../lib/anim";
import { WithFonts } from "../lib/fonts";

/** SEE THE SHAPE. 3.5s @ 30fps = 105 frames.
 *  The "see what your code actually means" beat — phrased as the
 *  promise the product delivers. Sits right after the cold-open so
 *  the brand lands, then this declares what it's for. */
export function SeeTheShape() {
  return (
    <WithFonts>
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
        <MaskUpText startFrame={4} durationFrames={22}>
          <h1
            style={{
              fontFamily: TYPE.display,
              fontSize: 124,
              fontWeight: 500,
              letterSpacing: "-0.045em",
              color: COLORS.ink,
              margin: 0,
              lineHeight: 1.02,
              textAlign: "center",
              maxWidth: 1500,
            }}
          >
            See what your code{" "}
            <span style={{ color: COLORS.magenta }}>actually does.</span>
          </h1>
        </MaskUpText>

        <FadeUp startFrame={36} durationFrames={22}>
          <p
            style={{
              fontFamily: TYPE.body,
              fontSize: 30,
              fontWeight: 400,
              color: COLORS.midGray,
              margin: 0,
              letterSpacing: "-0.005em",
              textAlign: "center",
              maxWidth: 1000,
              lineHeight: 1.4,
            }}
          >
            Not what it looks like in a file tree. The actual graph behind it.
          </p>
        </FadeUp>
      </AbsoluteFill>
    </WithFonts>
  );
}
