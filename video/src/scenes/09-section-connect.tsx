import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Eyebrow, FadeUp, MaskUpText, SettleFrame } from "../lib/anim";
import { COLORS, TYPE } from "../lib/tokens";

/** Scene 9 — SECTION TITLE: CONNECT CLAUDE CODE. 3s.
 *  Cuts to terminal recording: npm i, causalist install, Claude Code call. */
export function SectionConnect() {
  const frame = useCurrentFrame();
  // Two terminal lines type-on
  const line1 = Math.floor(interpolate(frame, [40, 60], [0, 30], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const line2 = Math.floor(interpolate(frame, [62, 84], [0, 60], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const cmd1 = "npm i -g causalist-cli && causalist install".slice(0, line1);
  const cmd2 = "claude mcp add causalist -- npx -y causalist-mcp".slice(0, line2);

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
              03 <span style={{ color: COLORS.magenta }}>/</span> connect claude code
            </Eyebrow>
          </FadeUp>

          <MaskUpText startFrame={10} durationFrames={16}>
            <h1
              style={{
                fontFamily: TYPE.display,
                fontSize: 116,
                fontWeight: 500,
                letterSpacing: "-0.04em",
                color: COLORS.ink,
                margin: 0,
                lineHeight: 0.95,
              }}
            >
              Two commands.
              <br />
              Eleven tools.
            </h1>
          </MaskUpText>

          <FadeUp startFrame={32} durationFrames={14}>
            <pre
              style={{
                fontFamily: TYPE.mono,
                fontSize: 22,
                color: COLORS.cream,
                backgroundColor: COLORS.ink,
                padding: "20px 24px",
                borderRadius: 12,
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              <span style={{ color: COLORS.midGray }}>$ </span>
              {cmd1}
              {"\n"}
              <span style={{ color: COLORS.midGray }}>$ </span>
              {cmd2}
            </pre>
          </FadeUp>
        </AbsoluteFill>
      </SettleFrame>
    </AbsoluteFill>
  );
}
