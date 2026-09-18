import { test, expect } from "@playwright/test";

/**
 * M0.4 perf baseline. Records, at phone-throttle (4x CPU, 390x844) and
 * desktop (1440x900): the median first-frame ms over three loads, the frame
 * throughput through one explode-depth sweep on the last (warm) load, the JS
 * heap in use after a forced collection, and any console message mentioning
 * WebGL.
 *
 * The output is a measurement, not a gate: nothing here asserts. `npm run
 * perf` (scripts/perf.mjs) rolls the two runs into
 * test-results/perf/baseline.json.
 */

type Mode = {
  name: string;
  width: number;
  height: number;
  throttle: number;
};
const MODES: Mode[] = [
  { name: "phone", width: 390, height: 844, throttle: 6 },
  { name: "desktop", width: 1440, height: 900, throttle: 1 },
];

const SWEEP_DEPTHS = [0, 0.5, 1];
/** Stop counting after this many painted frames or this wall time. */
const FRAME_TARGET = 90;
const SWEEP_CAP_MS = 20_000;
/** One slider step every this long, so the tweens run between steps. */
const STEP_INTERVAL_MS = 900;

const FIRST_FRAME_TIMEOUT = 45_000;

async function firstFrameMs(page: import("@playwright/test").Page): Promise<number> {
  const started = await page.evaluate(() => performance.now());
  // A dynamic chunk can take tens of seconds on a cold dev compile; the
  // measurement is of the load, so the timeout must not cut it off.
  await page
    .locator("canvas")
    .first()
    .waitFor({ state: "visible", timeout: FIRST_FRAME_TIMEOUT });
  // The element being visible is before the first painted frame; one rAF
  // callback later the canvas has drawn at least once.
  return page.evaluate(
    (t0) =>
      new Promise<number>((resolve) => {
        requestAnimationFrame(() => resolve(performance.now() - t0));
      }),
    started,
  );
}

/**
 * Moves the "Separate regions" slider through the depths, one step per
 * STEP_INTERVAL_MS, counting every painted frame until FRAME_TARGET or the
 * cap. Returns the honest throughput of the animation, not a race against a
 * fixed timeout.
 */
async function sweepThroughput(page: import("@playwright/test").Page) {
  return page.evaluate(
    ({ depths, frameTarget, capMs, stepMs }) =>
      new Promise<{ frames: number; elapsedMs: number }>((resolve) => {
        const start = performance.now();
        let frames = 0;
        let lastStep = 0;
        const queue = [...depths];
        const slider = document.querySelector<HTMLInputElement>(
          ".anatomy-slider input[type='range']",
        );
        const tick = () => {
          frames += 1;
          const elapsed = performance.now() - start;
          if (queue.length && elapsed - lastStep >= stepMs) {
            const next = queue.shift() as number;
            if (slider) {
              // React only sees a value change through the native setter.
              const setter = Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value",
              )?.set;
              setter?.call(slider, String(next));
              slider.dispatchEvent(new Event("input", { bubbles: true }));
              slider.dispatchEvent(new Event("change", { bubbles: true }));
            }
            lastStep = elapsed;
          }
          if (frames >= frameTarget || elapsed >= capMs) {
            resolve({ frames, elapsedMs: Math.round(elapsed) });
          } else {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      }),
    {
      depths: SWEEP_DEPTHS,
      frameTarget: FRAME_TARGET,
      capMs: SWEEP_CAP_MS,
      stepMs: STEP_INTERVAL_MS,
    },
  );
}

test("perf: first frame, depth sweep, heap, WebGL errors", async ({ browser }) => {
  test.setTimeout(300_000);
  const results: Record<string, unknown> = {};

  for (const mode of MODES) {
    const firstFrames: number[] = [];
    let sweep: { frames: number; elapsedMs: number } | null = null;
    let heapAfterBytes: number | null = null;
    const webglMessages: string[] = [];

    for (let run = 0; run < 3; run++) {
      const context = await browser.newContext({
        viewport: { width: mode.width, height: mode.height },
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: mode.throttle });

      page.on("console", (message) => {
        if (/webgl/i.test(message.text())) webglMessages.push(message.text());
      });

      await page.goto("/", { waitUntil: "commit" });
      const first = await firstFrameMs(page);
      firstFrames.push(first);

      // The sweep runs on the last load, when the dev server and the scene
      // are warm; a cold compile must not masquerade as frame cost.
      if (run === 2) {
        await page
          .locator(".anatomy-loading")
          .waitFor({ state: "hidden", timeout: 30_000 })
          .catch(() => {});
        await page.waitForTimeout(1_000);
        sweep = await sweepThroughput(page);
        // page.metrics() no longer exists in Playwright; read the heap over
        // CDP, after a forced collection so the number is live objects, not
        // uncollected garbage.
        await cdp.send("HeapProfiler.enable");
        await cdp.send("HeapProfiler.collectGarbage");
        await cdp.send("Performance.enable");
        const { metrics } = await cdp.send("Performance.getMetrics");
        const heap = metrics.find((m) => m.name === "JSHeapUsedSize");
        heapAfterBytes = heap ? Math.round(heap.value) : null;
      }
      await context.close();
    }

    firstFrames.sort((a, b) => a - b);
    results[mode.name] = {
      firstFrameMs: {
        runs: firstFrames.map((ms) => Math.round(ms)),
        median: Math.round(firstFrames[1]),
      },
      sweepFrames: sweep?.frames ?? 0,
      sweepElapsedMs: sweep?.elapsedMs ?? 0,
      sweepFramesPerSecond: sweep
        ? Math.round((sweep.frames / sweep.elapsedMs) * 1000 * 10) / 10
        : null,
      jsHeapBytes: heapAfterBytes,
      webglConsoleMessages: webglMessages,
    };
  }

  const { mkdirSync, writeFileSync } = await import("node:fs");
  mkdirSync("test-results/perf", { recursive: true });
  writeFileSync(
    "test-results/perf/raw.json",
    JSON.stringify(results, null, 2),
  );
  expect(Object.keys(results)).toEqual(MODES.map((m) => m.name));
});
