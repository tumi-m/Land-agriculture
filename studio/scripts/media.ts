/**
 * What the brief, render, review and ship stages share: the brief's spec,
 * the output folders, and FFmpeg/FFprobe. Remotion's own FFmpeg is a small
 * build without the filters review needs, so these use full static builds
 * (GPL; used here as tools, never shipped in the app).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";

export const STUDIO = join(import.meta.dirname, "..");
export const OUT = join(STUDIO, "out");
export const MASTER = join(OUT, "launch-master.mp4");
export const REVIEW = join(OUT, "review");
export const SHIP = join(OUT, "ship");
for (const dir of [OUT, REVIEW, SHIP]) mkdirSync(dir, { recursive: true });

export interface Brief {
  composition: string;
  seconds: number;
  fps: number;
  width: number;
  height: number;
  loudness: { integrated: number; tolerance: number; truePeakMax: number };
  review: { contactSheetEvery: number; maxFrozenSeconds: number };
  deliverables: Record<string, { maxMB?: number; frame?: number }>;
}

export const brief: Brief = JSON.parse(readFileSync(join(STUDIO, "briefs", "launch.json"), "utf8"));

/**
 * Runs FFmpeg and returns its log. FFmpeg writes its reports (loudness,
 * black and frozen frames) to stderr, so that is what comes back.
 */
export function ffmpeg(args: string[]): string {
  const result = spawnSync(ffmpegPath as unknown as string, ["-hide_banner", "-nostdin", "-y", ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`ffmpeg ${args.join(" ")}\n${result.stderr}`);
  return result.stderr;
}

export interface Probe {
  format: { duration: string; size: string; bit_rate: string };
  streams: {
    codec_type: string;
    codec_name: string;
    width?: number;
    height?: number;
    r_frame_rate?: string;
    sample_rate?: string;
    channels?: number;
  }[];
}

export function probe(file: string): Probe {
  return JSON.parse(
    execFileSync(ffprobe.path, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
}

export const megabytes = (file: string) => statSync(file).size / 1024 / 1024;
