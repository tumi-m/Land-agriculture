/**
 * Sound: the film's score and the app's interface cues, synthesised here
 * from sine partials and envelopes rather than taken from a library, so
 * there is nothing to license and every hit is placed on the film's own
 * timeline. FFmpeg then levels and encodes them.
 *
 *   studio/public/sound/score.wav       the film's bed, hits and pin ticks
 *   public/sounds/{open,close,select}   the app's opt-in cues (webm + mp3)
 *
 * Run with `npm run sound`.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import ffmpeg from "ffmpeg-static";
import { DURATION, FPS, PIN_COUNT, SCENES, pinFrame } from "../src/film/timeline";

const RATE = 48_000;
const STUDIO = join(import.meta.dirname, "..");
const FILM_OUT = join(STUDIO, "public", "sound");
const APP_OUT = join(STUDIO, "..", "public", "sounds");
const TMP = join(STUDIO, "out", "sound-tmp");
for (const dir of [FILM_OUT, APP_OUT, TMP]) mkdirSync(dir, { recursive: true });

/** A mono buffer and the tools to write into it. */
function track(seconds: number) {
  const data = new Float32Array(Math.ceil(seconds * RATE));
  /** Adds a sine partial with an attack/decay envelope starting at `at` s. */
  const tone = (at: number, freq: number, gain: number, attack: number, decay: number, length = attack + decay * 6) => {
    const start = Math.floor(at * RATE);
    const end = Math.min(data.length, start + Math.floor(length * RATE));
    for (let i = start; i < end; i++) {
      const t = (i - start) / RATE;
      const env = t < attack ? t / attack : Math.exp(-(t - attack) / decay);
      data[i] += Math.sin(2 * Math.PI * freq * t) * env * gain;
    }
  };
  /** A held chord with slow swells, slightly detuned for width. */
  const pad = (from: number, to: number, freqs: number[], gain: number) => {
    const start = Math.floor(from * RATE);
    const end = Math.min(data.length, Math.floor(to * RATE));
    const fade = 1.2 * RATE;
    for (let i = start; i < end; i++) {
      const t = (i - start) / RATE;
      const edge = Math.min(1, (i - start) / fade, (end - i) / fade);
      const breathe = 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.18 * t);
      let s = 0;
      for (const f of freqs) s += Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.003 * t);
      data[i] += (s / (freqs.length * 1.5)) * gain * edge * breathe;
    }
  };
  return { data, tone, pad };
}

function writeWav(file: string, channels: Float32Array[]) {
  const frames = channels[0].length;
  const buffer = Buffer.alloc(44 + frames * channels.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + frames * channels.length * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels.length, 22);
  buffer.writeUInt32LE(RATE, 24);
  buffer.writeUInt32LE(RATE * channels.length * 2, 28);
  buffer.writeUInt16LE(channels.length * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(frames * channels.length * 2, 40);
  let peak = 0;
  for (const c of channels) for (const v of c) peak = Math.max(peak, Math.abs(v));
  const scale = peak > 0.98 ? 0.98 / peak : 1;
  for (let i = 0; i < frames; i++)
    for (let c = 0; c < channels.length; c++)
      buffer.writeInt16LE(Math.round(channels[c][i] * scale * 32767), 44 + (i * channels.length + c) * 2);
  writeFileSync(file, buffer);
}

const ff = (...args: string[]) => execFileSync(ffmpeg as unknown as string, ["-hide_banner", "-loglevel", "error", "-y", ...args]);
const sec = (frame: number) => frame / FPS;

// --- The film's score -------------------------------------------------------
{
  const seconds = DURATION / FPS;
  const left = track(seconds);
  const right = track(seconds);
  // One chord per scene: A minor, F, C, G, A minor — calm, unresolved, then home.
  const chords: [number, number, number[]][] = [
    [SCENES.title.from, SCENES.country.from + 15, [110, 164.81, 220, 261.63]],
    [SCENES.country.from, SCENES.notices.from + 15, [87.31, 130.81, 174.61, 220]],
    [SCENES.notices.from, SCENES.process.from + 15, [130.81, 196, 261.63, 329.63]],
    [SCENES.process.from, SCENES.end.from + 15, [98, 146.83, 196, 246.94]],
    [SCENES.end.from, DURATION, [110, 164.81, 220, 329.63]],
  ];
  for (const [from, to, freqs] of chords) {
    left.pad(sec(from), sec(to), freqs, 0.22);
    right.pad(sec(from), sec(to), freqs.map((f) => f * 1.002), 0.22);
  }
  // A soft bell where each scene lands.
  for (const scene of Object.values(SCENES)) {
    for (const [f, g] of [[440, 0.28], [880, 0.1], [1318.5, 0.05]] as const) {
      left.tone(sec(scene.from) + 0.05, f, g, 0.008, 0.35);
      right.tone(sec(scene.from) + 0.07, f, g, 0.008, 0.35);
    }
  }
  // A tick for every notice pin as it lands, panned west to east.
  for (let i = 0; i < PIN_COUNT; i++) {
    const at = sec(pinFrame(i) + 12);
    const pan = PIN_COUNT > 1 ? i / (PIN_COUNT - 1) : 0.5;
    left.tone(at, 1760, 0.12 * (1 - pan * 0.7), 0.002, 0.05);
    right.tone(at, 1760, 0.12 * (0.3 + pan * 0.7), 0.002, 0.05);
  }
  const raw = join(TMP, "score-raw.wav");
  writeWav(raw, [left.data, right.data]);
  // Levelled to -16 LUFS integrated, the usual target for web video.
  ff("-i", raw, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", String(RATE), join(FILM_OUT, "score.wav"));
  console.log(`sound: score ${seconds.toFixed(1)} s → public/sound/score.wav`);
}

// --- The app's interface cues -------------------------------------------------
const CUES: Record<string, [number, number][]> = {
  // Two notes up: something opened.
  open: [[0, 659.25], [0.07, 880]],
  // Two notes down: it closed.
  close: [[0, 880], [0.07, 659.25]],
  // One soft tick: a choice was made.
  select: [[0, 1318.5]],
};
for (const [name, notes] of Object.entries(CUES)) {
  const cue = track(0.45);
  for (const [at, f] of notes) {
    cue.tone(at, f, 0.5, 0.004, 0.06);
    cue.tone(at, f * 2, 0.12, 0.004, 0.04);
  }
  const raw = join(TMP, `${name}.wav`);
  writeWav(raw, [cue.data]);
  // Quiet on purpose: a cue should be felt, not announced.
  const level = "volume=-10dB";
  ff("-i", raw, "-af", level, "-c:a", "libopus", "-b:a", "48k", join(APP_OUT, `${name}.webm`));
  ff("-i", raw, "-af", level, "-c:a", "libmp3lame", "-b:a", "64k", join(APP_OUT, `${name}.mp3`));
}
console.log(`sound: cues ${Object.keys(CUES).join(", ")} → public/sounds (webm + mp3)`);
rmSync(TMP, { recursive: true, force: true });
