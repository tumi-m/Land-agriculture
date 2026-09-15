import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { collectQuality, type QualityReport } from "./helpers/quality";

/**
 * M0.3 quality harness. Drives the explorer through a fixed matrix —
 * two form factors × light/dark, in the anatomy view (the four-layer model,
 * its sliders pinned to depths 0, 1/3, 2/3 and 1), the atlas view (sheet
 * closed, then the notice sheet open) — and records the same six numbers for
 * every state. It changes nothing in the product; it only reads geometry and
 * computed styles, never asserts pass/fail, so the run is a measurement.
 *
 * `npm run quality` (scripts/quality.mjs) executes this spec and renders the
 * JSON into test-results/quality/baseline.json plus a human table in
 * docs/map-quality-baseline.md.
 */

const FORM_FACTORS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

const SCHEMES = ["light", "dark"] as const;
/** Anatomy "Separate regions" depths, as fractions of the slider's 0–1. */
const DEPTHS = [0, 0.33, 0.66, 1] as const;

const OUT = "test-results/quality";

async function setTheme(page: import("@playwright/test").Page, scheme: "light" | "dark") {
  // The app owns the dark class; driving it through the same class keeps
  // three.js token readers in step (onThemeChange). Cleared after each run.
  await page.evaluate((dark) => {
    document.documentElement.classList.toggle("dark", dark);
    window.dispatchEvent(new Event("all-theme-change"));
  }, scheme === "dark");
}

async function settle(page: import("@playwright/test").Page) {
  await page
    .locator("canvas, .anatomy-loading")
    .first()
    .waitFor({ state: "visible", timeout: 20_000 })
    .catch(() => {});
  // Measuring mid-animation races the dossier's 250 ms rise and the explode
  // transition; wait until none of the tracked elements is still moving,
  // with a generous cap so a stuck animation degrades to a slow pass rather
  // than a failure.
  await page
    .evaluate(
      () =>
        Promise.race([
          // document.getAnimations is still missing from TS's DOM lib
          // (tracked at microsoft/TypeScript-DOM-lib-generator#1616); every
          // evergreen browser ships it.
          ...(document as unknown as {
            getAnimations: (o: { subtree: boolean }) => { finished: Promise<unknown> }[];
          })
            .getAnimations({ subtree: true })
            .map((a) => a.finished.catch(() => undefined))
            .map((p) => Promise.all([p])),
          new Promise((resolve) => setTimeout(resolve, 4000)),
        ]),
    )
    .catch(() => {});
  await page.waitForTimeout(600);
}

async function anatomyDepths(
  page: import("@playwright/test").Page,
  prefix: string,
  into: QualityReport[],
) {
  for (const depth of DEPTHS) {
    await page.evaluate((d) => {
      const slider = document.querySelector<HTMLInputElement>(
        ".anatomy-slider input[type='range']",
      );
      if (!slider) return;
      const min = Number(slider.min || 0);
      const max = Number(slider.max || 1);
      slider.value = String(min + (max - min) * d);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    }, depth);
    // Let the explode transition land before the geometry is read.
    await page.waitForTimeout(400);
    into.push(await collectQuality(page, `${prefix} anatomy depth ${depth}`));
  }
}

test("quality: measure the explorer across its states", async ({ browser }) => {
  test.setTimeout(300_000);
  const reports: QualityReport[] = [];

  for (const form of FORM_FACTORS) {
    for (const scheme of SCHEMES) {
      const context = await browser.newContext({
        viewport: { width: form.width, height: form.height },
        colorScheme: scheme,
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(String(error)));

      const prefix = `${form.name}-${scheme}`;
      await page.goto("/");
      await settle(page);
      await setTheme(page, scheme);
      await anatomyDepths(page, prefix, reports);

      // Atlas, sheet closed, then with the notice "sheet" open: a notice
      // click moves the explorer to the atlas with the dossier expanded.
      await page.goto("/?view=atlas");
      await settle(page);
      await setTheme(page, scheme);
      reports.push(await collectQuality(page, `${prefix} atlas`));

      await page.goto("/?view=atlas&at=notice:cornucopia");
      await settle(page);
      await setTheme(page, scheme);
      await page
        .locator(".map-selection-chip, .province-detail, [data-chrome]")
        .first()
        .waitFor({ state: "visible", timeout: 10_000 })
        .catch(() => {});
      reports.push(await collectQuality(page, `${prefix} atlas notice`));

      if (errors.length) {
        console.error(`quality: page errors in ${prefix}: ${errors.join("; ")}`);
      }
      await context.close();
    }
  }

  mkdirSync(OUT, { recursive: true });
  const byKey = new Map(reports.map((r) => [r.state, r]));
  writeFileSync(
    join(OUT, "raw.json"),
    JSON.stringify(Object.fromEntries(byKey), null, 2),
  );
  // The spec must not fail on what it finds — it is a gauge, not a gate.
  // Gating lives in QC0+ on top of the numbers it records.
  expect(reports).toHaveLength(FORM_FACTORS.length * SCHEMES.length * (DEPTHS.length + 2));
  expect(byKey.size).toBe(reports.length);
});
