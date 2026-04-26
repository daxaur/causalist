import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CausalistLogo, FadeUp } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";

/** Scene — CLOSING. 3.5s @ 30fps = 105 frames.
 *  Centered logo, wordmark, single meta line, slow fade-out.
 *  No three-line meta (open source / MIT / xyz blocks the eye) —
 *  one calm line is enough. */
export function Closing() {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [88, 105], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.cream, opacity: fadeOut }}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 44,
        }}
      >
        <CausalistLogo size={160} startFrame={2} />

        <FadeUp startFrame={28} durationFrames={18}>
          <h1
            style={{
              fontFamily: TYPE.display,
              fontSize: 124,
              fontWeight: 500,
              letterSpacing: "-0.04em",
              color: COLORS.ink,
              margin: 0,
              lineHeight: 1,
            }}
          >
            causalist
          </h1>
        </FadeUp>

        <FadeUp startFrame={48} durationFrames={20}>
          <p
            style={{
              fontFamily: TYPE.body,
              fontSize: 22,
              color: COLORS.midGray,
              margin: 0,
              fontStyle: "italic",
            }}
          >
            Built with Claude Opus 4.7
          </p>
        </FadeUp>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
