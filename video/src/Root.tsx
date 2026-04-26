import { Composition } from "remotion";

// Production cuts (in story order). The four "kept" anchors are the
// cold-open / problem / pivot / closing; the new graph-themed cuts
// (logo-as-graph, agents-on-graph, bringing-causality-to-agents,
// claude-code-builds-for-you) carry the rest of the story. The PR
// cuts and the section bridges were dropped — see SCRIPT.md for the
// edit timeline.

import { ColdOpen } from "./scenes/01-cold-open";
import { TheProblem } from "./scenes/02-the-problem";
import { ThePivot } from "./scenes/03-the-pivot";
import { Closing } from "./scenes/10-closing";
import { LogoDrawsAsGraph } from "./scenes/11-logo-draws-as-graph";
import { LogoDrawsAsGraphAlt } from "./scenes/12-logo-draws-as-graph-alt";
import { AgentsOnGraph } from "./scenes/13-agents-on-graph";
import { BringingCausalityToAgents } from "./scenes/14-bringing-causality-to-agents";
import { ClaudeCodeBuildsForYou } from "./scenes/15-claude-code-builds-for-you";

const FPS = 30;
const W = 1920;
const H = 1080;

export const RemotionRoot = () => (
  <>
    {/* Anchors */}
    <Composition
      id="cold-open"
      component={ColdOpen}
      durationInFrames={150}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="the-problem"
      component={TheProblem}
      durationInFrames={90}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="the-pivot"
      component={ThePivot}
      durationInFrames={90}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="closing"
      component={Closing}
      durationInFrames={120}
      fps={FPS}
      width={W}
      height={H}
    />

    {/* Brand opener — two variants, pick one in the cut */}
    <Composition
      id="logo-draws-as-graph"
      component={LogoDrawsAsGraph}
      durationInFrames={150}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="logo-draws-as-graph-alt"
      component={LogoDrawsAsGraphAlt}
      durationInFrames={150}
      fps={FPS}
      width={W}
      height={H}
    />

    {/* Centerpiece — agents drawing the graph */}
    <Composition
      id="agents-on-graph"
      component={AgentsOnGraph}
      durationInFrames={180}
      fps={FPS}
      width={W}
      height={H}
    />

    {/* Story headlines */}
    <Composition
      id="bringing-causality-to-agents"
      component={BringingCausalityToAgents}
      durationInFrames={120}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="claude-code-builds-for-you"
      component={ClaudeCodeBuildsForYou}
      durationInFrames={150}
      fps={FPS}
      width={W}
      height={H}
    />
  </>
);
