/**
 * Render: the film to a high-quality master, which review checks and ship
 * encodes from. Remotion drives a headless Chromium; set REMOTION_BROWSER
 * to use one already installed, and REMOTION_GL=swiftshader where there is
 * no GPU.
 */
import { execFileSync } from "node:child_process";
import { MASTER, STUDIO, brief } from "./media";

const args = [
  "remotion",
  "render",
  "src/index.ts",
  brief.composition,
  MASTER,
  "--codec=h264",
  "--crf=12",
  "--jpeg-quality=95",
  "--audio-codec=aac",
  "--audio-bitrate=320k",
  `--gl=${process.env.REMOTION_GL ?? "angle"}`,
  "--timeout=120000",
];
if (process.env.REMOTION_BROWSER) args.push(`--browser-executable=${process.env.REMOTION_BROWSER}`);
if (process.env.SITE_URL) args.push(`--props=${JSON.stringify({ siteUrl: process.env.SITE_URL })}`);

const started = Date.now();
execFileSync("npx", args, { cwd: STUDIO, stdio: "inherit" });
console.log(`render: ${MASTER} in ${Math.round((Date.now() - started) / 1000)} s`);
