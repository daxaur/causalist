import { Composition } from "remotion";

// 7 production cuts. All centered, all using the actual Causalist
// brand mark (the C-with-two-dots from public/icon.svg, redrawn in
// Remotion via the CausalistLogo component in lib/anim.tsx).
//
// Order: cold-open · the-problem · the-pivot ·
//        bringing-causality-to-agents · agents-on-graph ·
//        claude-code-builds-for-you · closing.

import { ColdOpen } from "./scenes/01-cold-open";
import { TheProblem } from "./scenes/02-the-problem";
import { ThePivot } from "./scenes/03-the-pivot";
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
      id="the-problem"
      component={TheProblem}
      durationInFrames={75}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="the-pivot"
      component={ThePivot}
      durationInFrames={75}
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
