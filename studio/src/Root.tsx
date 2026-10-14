import { Composition } from "remotion";
import { CountryScene } from "./film/CountryScene";
import { EndScene, type EndProps } from "./film/EndScene";
import { LaunchFilm } from "./film/LaunchFilm";
import { NoticesScene } from "./film/NoticesScene";
import { ProcessScene } from "./film/ProcessScene";
import { TitleScene } from "./film/TitleScene";
import { DURATION, FPS, HEIGHT, SCENES, WIDTH } from "./film/timeline";

const video = { fps: FPS, width: WIDTH, height: HEIGHT };
const endProps: EndProps = {};

/** The film, and each scene on its own for working on it. */
export const Root = () => (
  <>
    <Composition id="Launch" component={LaunchFilm} durationInFrames={DURATION} defaultProps={endProps} {...video} />
    <Composition id="Title" component={TitleScene} durationInFrames={SCENES.title.duration} {...video} />
    <Composition id="Country" component={CountryScene} durationInFrames={SCENES.country.duration} {...video} />
    <Composition id="Notices" component={NoticesScene} durationInFrames={SCENES.notices.duration} {...video} />
    <Composition id="Process" component={ProcessScene} durationInFrames={SCENES.process.duration} {...video} />
    <Composition id="End" component={EndScene} durationInFrames={SCENES.end.duration} defaultProps={endProps} {...video} />
  </>
);
