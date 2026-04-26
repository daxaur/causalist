import { Composition } from "remotion";

import { ColdOpen } from "./scenes/01-cold-open";
import { TheProblem } from "./scenes/02-the-problem";
import { ThePivot } from "./scenes/03-the-pivot";
import { SectionMap } from "./scenes/04-section-map";
import { FourAgents } from "./scenes/05-four-agents";
import { AstVerified } from "./scenes/06-ast-verified";
import { SectionPoint } from "./scenes/07-section-point";
import { PrOpened } from "./scenes/08-pr-opened";
import { SectionConnect } from "./scenes/09-section-connect";
import { Closing } from "./scenes/10-closing";

const FPS = 30;
const W = 1920;
const H = 1080;

// Each scene is a separate composition so you can render them
// individually (`remotion render src/index.ts cold-open out/...mp4`)
// and stitch with screen recordings in the editor.
export const RemotionRoot = () => (
  <>
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
      id="section-map"
      component={SectionMap}
      durationInFrames={90}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="four-agents"
      component={FourAgents}
      durationInFrames={90}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="ast-verified"
      component={AstVerified}
      durationInFrames={90}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="section-point"
      component={SectionPoint}
      durationInFrames={90}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="pr-opened"
      component={PrOpened}
      durationInFrames={90}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="section-connect"
      component={SectionConnect}
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
  </>
);
