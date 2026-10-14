/**
 * Interface sounds: three short cues, off until the reader turns them on.
 * The cues are synthesised in the studio (studio/scripts/sound.ts) and served
 * from public/sounds as WebM/Opus with an MP3 fallback. Howler is fetched the
 * first time a cue plays, so a reader who never turns sound on never loads it.
 */
import type { Howl } from "howler";
import type { Selection } from "@/state/explorer";

export type Cue = "open" | "close" | "select";
export const CUES: Cue[] = ["open", "close", "select"];

const KEY = "all-sound";

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function setSoundOn(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* private mode: sound stays off after a reload */
  }
}

/**
 * Which cue a change of selection makes: opening something from the whole
 * country, closing back to it, or moving between two things. Nothing when
 * the selection has not really changed.
 */
export function cueFor(before: Selection, after: Selection): Cue | null {
  if (JSON.stringify(before) === JSON.stringify(after)) return null;
  if (after.kind === "country") return "close";
  if (before.kind === "country") return "open";
  return "select";
}

let loading: Promise<Record<Cue, Howl>> | null = null;

function cues(): Promise<Record<Cue, Howl>> {
  loading ??= import("howler").then(({ Howl }) => {
    const entries = CUES.map(
      (cue) => [cue, new Howl({ src: [`/sounds/${cue}.webm`, `/sounds/${cue}.mp3`], volume: 0.5 })] as const,
    );
    return Object.fromEntries(entries) as Record<Cue, Howl>;
  });
  return loading;
}

/** Plays a cue if the reader has sound on. Never throws: sound is a nicety. */
export function play(cue: Cue): void {
  if (!soundOn()) return;
  cues()
    .then((all) => all[cue].play())
    .catch(() => {
      loading = null;
    });
}
