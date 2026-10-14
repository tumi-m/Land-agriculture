/**
 * "Save a clip": a short video of the model turning once around the view
 * the reader has framed, captioned with the place and the sources the stage
 * itself shows, encoded in the browser by Mediabunny (WebCodecs) and handed
 * back as a file. Nothing leaves the device.
 *
 * Each frame is drawn on demand at the clip's own size, copied onto a 2D
 * canvas with the caption, and given to the encoder before the next one is
 * drawn, so the clip is exactly one turn at a steady rate however slow the
 * device. The camera, the canvas size and the controls are put back after.
 */
import * as THREE from "three";
import { CARD } from "@/design/ramps";
import type { SceneCore } from "./core";

export const CLIP = { width: 1280, height: 720, fps: 30, seconds: 6 } as const;

/** How far the picture is raised so the subject clears the caption below it, in px. */
const CAPTION_LIFT = 56;

/** Azimuth added at frame `frame` of `frames`: one full turn, ending where it began. */
export function orbitAngle(frame: number, frames: number): number {
  return (frame / frames) * Math.PI * 2;
}

/** "KwaZulu-Natal · uMkhanyakude" → "asbonge-kwazulu-natal-umkhanyakude.mp4" */
export function clipFileName(place: string, extension: string): string {
  const slug = place
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `asbonge-${slug || "south-africa"}${extension}`;
}

/** Breaks `text` into at most `max` lines that fit `width`, ending in "…" if cut. */
export function wrapLines(
  text: string,
  width: number,
  measure: (s: string) => number,
  max: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= width || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === max) break;
  }
  if (lines.length < max && line) lines.push(line);
  else if (line && lines.length === max) {
    let last = lines[max - 1];
    while (last && measure(`${last}…`) > width) last = last.slice(0, -1);
    lines[max - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

/** "#0b1f27", 0.5 → "rgba(11, 31, 39, 0.5)" */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fontVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  stage: HTMLCanvasElement,
  place: string,
  sources: string[],
) {
  const { width, height } = CLIP;
  const backdrop = ctx.createLinearGradient(0, 0, 0, height);
  backdrop.addColorStop(0, CARD.stageTop);
  backdrop.addColorStop(1, CARD.stageBottom);
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(stage, 0, 0, width, height);

  const display = fontVar("--font-display", "sans-serif");
  const body = fontVar("--font-sans", "sans-serif");
  ctx.font = `600 15px ${body}`;
  const lines = sources.flatMap((s) => wrapLines(s, width - 64, (t) => ctx.measureText(t).width, 2));
  const band = 92 + lines.length * 21;
  const shade = ctx.createLinearGradient(0, height - band, 0, height);
  shade.addColorStop(0, withAlpha(CARD.stageBottom, 0));
  shade.addColorStop(0.35, withAlpha(CARD.stageBottom, 0.82));
  shade.addColorStop(1, withAlpha(CARD.stageBottom, 0.94));
  ctx.fillStyle = shade;
  ctx.fillRect(0, height - band, width, band);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = CARD.muted;
  ctx.font = `600 14px ${body}`;
  ctx.fillText("ASBONGE LAND LOCATOR", 32, 40);
  ctx.fillStyle = CARD.ink;
  ctx.font = `700 30px ${display}`;
  ctx.fillText(place, 32, height - 24 - lines.length * 21 - 14);
  ctx.fillStyle = CARD.muted;
  ctx.font = `400 15px ${body}`;
  lines.forEach((l, i) => ctx.fillText(l, 32, height - 24 - (lines.length - 1 - i) * 21));
}

export interface Clip {
  blob: Blob;
  name: string;
}

/** True where the browser has the WebCodecs encoder a clip needs. */
export const canRecordClips = () => typeof window !== "undefined" && "VideoEncoder" in window;

export async function recordOrbit(
  core: SceneCore,
  {
    place,
    sources,
    pivot,
    onProgress,
  }: {
    place: string;
    sources: string[];
    /** What to turn around: the middle of what is drawn, if not the orbit target. */
    pivot?: THREE.Vector3 | null;
    onProgress?: (done: number) => void;
  },
): Promise<Clip> {
  const media = await import("mediabunny");
  const { width, height, fps, seconds } = CLIP;
  const codec = await media.getFirstEncodableVideoCodec(["avc", "vp9", "av1"], { width, height });
  if (!codec) throw new Error("this browser cannot encode video");
  const format =
    codec === "avc" ? new media.Mp4OutputFormat({ fastStart: "in-memory" }) : new media.WebMOutputFormat();
  const target = new media.BufferTarget();
  const output = new media.Output({ format, target });
  const frame = document.createElement("canvas");
  frame.width = width;
  frame.height = height;
  const ctx = frame.getContext("2d");
  if (!ctx) throw new Error("no 2D canvas");
  const source = new media.CanvasSource(frame, { codec, bitrate: media.QUALITY_HIGH });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  const { renderer, scene, camera, controls } = core;
  const size = renderer.getSize(new THREE.Vector2());
  const ratio = renderer.getPixelRatio();
  const aspect = camera.aspect;
  // The stage shifts its view to leave room for an open panel; a clip has no
  // panel, only its caption, so it uses its own shift and puts the stage's back.
  const view = camera.view?.enabled ? { ...camera.view } : null;
  const position = camera.position.clone();
  const rotating = controls.autoRotate;
  // The reader's angle and distance, kept, around the middle of what is drawn.
  const spherical = new THREE.Spherical().setFromVector3(position.clone().sub(controls.target));
  const centre = pivot?.clone() ?? controls.target.clone();
  const start = spherical.theta;
  const offset = new THREE.Vector3();

  controls.enabled = false;
  controls.autoRotate = false;
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  camera.setViewOffset(width, height, 0, CAPTION_LIFT, width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  const frames = fps * seconds;
  try {
    for (let i = 0; i < frames; i++) {
      spherical.theta = start + orbitAngle(i, frames);
      camera.position.copy(centre).add(offset.setFromSpherical(spherical));
      camera.lookAt(centre);
      renderer.render(scene, camera);
      // Copied in the same task as the draw, before the browser can clear it.
      drawFrame(ctx, renderer.domElement, place, sources);
      await source.add(i / fps, 1 / fps);
      onProgress?.((i + 1) / frames);
    }
    await output.finalize();
  } catch (error) {
    await output.cancel();
    throw error;
  } finally {
    renderer.setPixelRatio(ratio);
    renderer.setSize(size.x, size.y);
    camera.aspect = aspect;
    if (view) camera.setViewOffset(view.fullWidth, view.fullHeight, view.offsetX, view.offsetY, view.width, view.height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    camera.position.copy(position);
    camera.lookAt(controls.target);
    controls.autoRotate = rotating;
    controls.enabled = true;
    core.wake();
  }

  const buffer = target.buffer;
  if (!buffer) throw new Error("the encoder produced nothing");
  return {
    blob: new Blob([buffer], { type: format.mimeType }),
    name: clipFileName(place, format.fileExtension),
  };
}
