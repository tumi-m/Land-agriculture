/**
 * Brief: the first step of the loop. Prints the brief and checks that the
 * cut in src/film/timeline.ts is the film the brief asks for, before an
 * hour goes into rendering the wrong one.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DURATION, FPS, HEIGHT, SCENES, WIDTH } from "../src/film/timeline";
import { STUDIO, brief } from "./media";

console.log(readFileSync(join(STUDIO, "briefs", "launch.md"), "utf8"));

const problems: string[] = [];
const expect = (what: string, actual: unknown, wanted: unknown) => {
  if (actual !== wanted) problems.push(`${what}: the cut has ${actual}, the brief asks for ${wanted}`);
};
expect("length", DURATION / FPS, brief.seconds);
expect("frame rate", FPS, brief.fps);
expect("width", WIDTH, brief.width);
expect("height", HEIGHT, brief.height);

// Scenes run in order, each starting before the last one ends.
const scenes = Object.entries(SCENES);
for (let i = 1; i < scenes.length; i++) {
  const [prev, a] = scenes[i - 1];
  const [name, b] = scenes[i];
  if (b.from > a.from + a.duration) problems.push(`a gap between ${prev} and ${name}`);
  if (b.from <= a.from) problems.push(`${name} starts before ${prev}`);
}

const poster = brief.deliverables.poster?.frame ?? 0;
if (poster >= DURATION) problems.push(`the poster frame ${poster} is past the end (${DURATION} frames)`);

if (problems.length) {
  console.error(`The cut does not match the brief:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`brief: the cut matches — ${brief.seconds} s, ${scenes.length} scenes, ${WIDTH}×${HEIGHT} at ${FPS} fps.`);
