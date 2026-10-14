/**
 * The film's cut, in frames at 30 fps. The score (scripts/sound.ts) reads the
 * same numbers, so every sound lands on the frame its picture does.
 */
import { NOTICE_PINS } from "./data";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Scenes overlap by OVERLAP frames and cross-fade. */
export const OVERLAP = 15;
export const SCENES = {
  title: { from: 0, duration: 120 },
  country: { from: 105, duration: 285 },
  notices: { from: 375, duration: 195 },
  process: { from: 555, duration: 135 },
  end: { from: 675, duration: 75 },
} as const;
export const DURATION = SCENES.end.from + SCENES.end.duration;

/** Inside the notices scene: the outline draws, then pins drop west to east. */
export const OUTLINE_FRAMES = 55;
export const PIN_STEP = 4;
export const PIN_FRAMES = 36;
export const pinFrame = (index: number) => SCENES.notices.from + OUTLINE_FRAMES + index * PIN_STEP;
export const PIN_COUNT = NOTICE_PINS.length;

/** Inside the process scene: each stage bar grows in turn. */
export const STAGE_STEP = 14;
