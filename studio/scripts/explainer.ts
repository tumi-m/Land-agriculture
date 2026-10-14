/**
 * Renders the Motion Canvas explainers without anyone at the editor: starts
 * the editor's dev server, opens it headless with `?render` (which starts a
 * render with the settings in explainers/*.meta), and waits for the MP4 the
 * FFmpeg exporter writes. Set REMOTION_BROWSER to the Chromium to use.
 */
import { existsSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { OUT, probe } from "./media";

const target = join(OUT, "explainers", "process.mp4");
rmSync(target, { force: true });

const server = await createServer({
  configFile: join(import.meta.dirname, "..", "explainers", "vite.config.ts"),
  server: { host: "127.0.0.1", port: 9310, strictPort: true },
  logLevel: "warn",
});
await server.listen();

const browser = await chromium.launch({
  executablePath: process.env.REMOTION_BROWSER,
  args: process.env.REMOTION_GL === "swiftshader" ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : [],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on("pageerror", (e) => console.error(`explainer: ${e.message}`));
await page.goto("http://127.0.0.1:9310/?render");

// The MP4 is finished once FFprobe can read it and it has stopped growing.
const started = Date.now();
let last = -1;
let steady = 0;
while (steady < 3) {
  if (Date.now() - started > 15 * 60_000) throw new Error("explainer: no finished render after 15 minutes");
  await new Promise((r) => setTimeout(r, 2000));
  if (!existsSync(target)) continue;
  const size = statSync(target).size;
  let readable = true;
  try {
    probe(target);
  } catch {
    readable = false;
  }
  steady = readable && size === last ? steady + 1 : 0;
  last = size;
}

await browser.close();
await server.close();
const info = probe(target);
const v = info.streams.find((s) => s.codec_type === "video");
console.log(
  `explainer: ${target} — ${v?.width}×${v?.height}, ${Number(info.format.duration).toFixed(1)} s, ${(last / 1024 / 1024).toFixed(1)} MB in ${Math.round((Date.now() - started) / 1000)} s`,
);
