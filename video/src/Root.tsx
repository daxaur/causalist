import { Composition } from "remotion";

// 7 production cuts. Positive opening — never names a competing tool;
// the story is "code is causal → agents work better with the graph →
// here's our graph → pair it with Claude Code." All cuts centered,
// brand fonts loaded, the actual Causalist mark used everywhere.

import { ColdOpen } from "./scenes/01-cold-open";
import { CodeIsCausal } from "./scenes/02-code-is-causal";
import { AgentsNeedGraphs } from "./scenes/03-agents-need-graphs";
import { Closing } from "./scenes/10-closing";
import { AgentsOnGraph } from "./scenes/13-agents-on-graph";
import { BringingCausalityToAgents } from "./scenes/14-bringing-causality-to-agents";
import { ClaudeCodeBuildsForYou } from "./scenes/15-claude-code-builds-for-you";

const FPS = 30;
const W = 1920;
const H = 1080;

export const RemotionRoot = () => (
  <>
    <Composition
      id="cold-open"
      component={ColdOpen}
      durationInFrames={105}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="code-is-causal"
      component={CodeIsCausal}
      durationInFrames={90}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="agents-need-graphs"
      component={AgentsNeedGraphs}
      durationInFrames={90}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="bringing-causality-to-agents"
      component={BringingCausalityToAgents}
      durationInFrames={90}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="agents-on-graph"
      component={AgentsOnGraph}
      durationInFrames={120}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="claude-code-builds-for-you"
      component={ClaudeCodeBuildsForYou}
      durationInFrames={105}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="closing"
      component={Closing}
      durationInFrames={105}
      fps={FPS}
      width={W}
      height={H}
    />
  </>
);
