// Runs the M0.4 perf spec and rolls its raw measurements into
// test-results/perf/baseline.json, the committed performance zero point.
// Like `quality`, this is a measurement run: it exits 0 on problems it finds
// so the baseline records reality, and fails only when the spec cannot run.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = "test-results/perf";

console.log("perf: running e2e/perf.spec.ts (throttled phone and desktop)");
try {
  execFileSync(
    "npx",
    ["playwright", "test", "--config=playwright.measure.config.ts", "e2e/perf.spec.ts"],
    { stdio: "inherit" },
  );
} catch {
  console.error("perf: the spec failed to run; fix it before committing a baseline");
  process.exit(1);
}

const rawPath = join(OUT, "raw.json");
if (!existsSync(rawPath)) {
  console.error(`perf: ${rawPath} missing; the spec produced no measurements`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(rawPath, "utf8"));

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, "baseline.json"),
  JSON.stringify(
    Object.fromEntries(
      Object.entries(raw).map(([mode, m]) => [
        mode,
        {
          medianFirstFrameMs: m.firstFrameMs.median,
          sweepFramesPerSecond: m.sweepFramesPerSecond,
          sweepFrames: m.sweepFrames,
          sweepElapsedMs: m.sweepElapsedMs,
          jsHeapBytes: m.jsHeapBytes,
          webglConsoleErrors: m.webglConsoleMessages.length,
        },
      ]),
    ),
    null,
    2,
  ),
);

for (const [mode, m] of Object.entries(raw)) {
  console.log(
    `perf: ${mode} first-frame median ${m.firstFrameMs.median} ms ` +
      `(runs ${m.firstFrameMs.runs.join(", ")}), depth sweep ` +
      `${m.sweepFramesPerSecond ?? "?"} fps (${m.sweepFrames} frames in ` +
      `${m.sweepElapsedMs} ms), heap ${m.jsHeapBytes ?? "?"} bytes, ` +
      `${m.webglConsoleMessages.length} WebGL console message(s)`,
  );
}
console.log(`perf: baseline -> ${OUT}/baseline.json`);
