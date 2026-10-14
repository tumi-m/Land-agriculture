/**
 * The launch film: five scenes on one timeline (timeline.ts), each fading in
 * over the tail of the one before, with the score laid under the whole cut.
 */
import type { ReactNode } from "react";
import { AbsoluteFill, Html5Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { CountryScene } from "./CountryScene";
import { EndScene, type EndProps } from "./EndScene";
import { NoticesScene } from "./NoticesScene";
import { ProcessScene } from "./ProcessScene";
import { TitleScene } from "./TitleScene";
import { OVERLAP, SCENES } from "./timeline";

function FadeIn({ children, from }: { children: ReactNode; from: number }) {
  const frame = useCurrentFrame();
  const opacity = from === 0 ? 1 : interpolate(frame, [0, OVERLAP], [0, 1], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

export function LaunchFilm({ siteUrl }: EndProps) {
  const scenes: [keyof typeof SCENES, ReactNode][] = [
    ["title", <TitleScene />],
    ["country", <CountryScene />],
    ["notices", <NoticesScene />],
    ["process", <ProcessScene />],
    ["end", <EndScene siteUrl={siteUrl} />],
  ];
  return (
    <AbsoluteFill>
      {scenes.map(([name, scene]) => (
        <Sequence key={name} name={name} from={SCENES[name].from} durationInFrames={SCENES[name].duration}>
          <FadeIn from={SCENES[name].from}>{scene}</FadeIn>
        </Sequence>
      ))}
      <Html5Audio src={staticFile("sound/score.wav")} />
    </AbsoluteFill>
  );
}
