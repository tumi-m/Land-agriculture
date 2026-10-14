/**
 * Motion Canvas explainers. `npm run explainer` opens the editor; `npm run
 * explainer:render` renders every project to out/explainers without one.
 */
import path from "node:path";
import { defineConfig } from "vite";
import motionCanvasPlugin from "@motion-canvas/vite-plugin";
import ffmpegPlugin from "@motion-canvas/ffmpeg";

// Both ship as CommonJS with a default export.
const interop = <T>(m: T | { default: T }) => ((m as { default?: T }).default ?? m) as T;
const motionCanvas = interop(motionCanvasPlugin);
const ffmpeg = interop(ffmpegPlugin);

const studio = path.resolve(import.meta.dirname, "..");

export default defineConfig({
  root: studio,
  resolve: { alias: { "@": path.resolve(studio, "../src") } },
  plugins: [motionCanvas({ project: ["./explainers/process.ts"], output: "./out/explainers" }), ffmpeg()],
});
