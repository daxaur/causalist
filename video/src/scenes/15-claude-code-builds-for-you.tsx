// MCP / CLI cut. Headline + 11 graph-aware tool pill chips falling
// into a clean grid. Sells the "connect Claude Code, let it build for
// you" arm of the story.

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, TYPE } from "../lib/tokens";
import { easeOutCubic, Eyebrow, FadeUp, MaskUpText } from "../lib/anim";

// Mirrors packages/mcp/src/tools.ts — kept hand-typed to keep the
// video bundle independent of the app's package graph. If the tool
// list changes, update here.
const TOOLS = [
  "find_node",
  "get_neighbors",
  "blast_radius",
  "shortest_path",
  "list_layer",
  "list_kind",
  "summarize_node",
  "explain_subgraph",
  "search_nodes",
  "diff_commits",
  "create_project",
];

export const ClaudeCodeBuildsForYou: React.FC = () => {
  const frame = useCurrentFrame();
  // 5s @ 30fps = 150 frames
  //   0–18  eyebrow + headline land
  //   18–80 tools fall in (staggered)
  //   80–150 hold

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
        gap: 32,
      }}
    >
      <FadeUp startFrame={2} durationFrames={14}>
        <Eyebrow>04 / connect</Eyebrow>
      </FadeUp>

      <MaskUpText startFrame={10} durationFrames={20}>
        <div
          style={{
            fontFamily: TYPE.display,
            fontSize: 124,
            fontWeight: 500,
            letterSpacing: "-0.04em",
            color: COLORS.ink,
            lineHeight: 1.02,
            maxWidth: 1500,
          }}
        >
          Connect Claude Code,{" "}
          <span style={{ color: COLORS.magenta }}>let it build for you.</span>
        </div>
      </MaskUpText>

      <FadeUp startFrame={36} durationFrames={18}>
        <div
          style={{
            fontFamily: TYPE.body,
            fontSize: 30,
            color: COLORS.midGray,
            letterSpacing: "-0.005em",
            lineHeight: 1.4,
            maxWidth: 1100,
            fontStyle: "italic",
          }}
        >
          MCP server · CLI · {TOOLS.length} graph-aware tools the agent can
          call directly.
        </div>
      </FadeUp>

      {/* Tool pills */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          maxWidth: 1500,
        }}
      >
        {TOOLS.map((t, i) => {
          const start = 56 + i * 4;
          const opacity = interpolate(
            frame,
            [start, start + 14],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: easeOutCubic,
            },
          );
          const ty = interpolate(
            frame,
            [start, start + 14],
            [10, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: easeOutCubic,
            },
          );
          return (
            <div
              key={t}
              style={{
                opacity,
                transform: `translateY(${ty}px)`,
                fontFamily: TYPE.mono,
                fontSize: 22,
                color: COLORS.ink,
                backgroundColor: "white",
                border: `1px solid ${COLORS.hairline}`,
                borderRadius: 999,
                padding: "10px 22px",
                letterSpacing: "-0.01em",
              }}
            >
              {t}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
