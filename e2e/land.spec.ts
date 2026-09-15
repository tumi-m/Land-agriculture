import { test, expect } from "@playwright/test";
import { findLiveMap, waitForVectorFeatures } from "./helpers/map";

/**
 * The Land view must actually draw its vector layers.
 *
 * A missing MapLibre worker (the bundler rewrites the `import.meta.url` the
 * library uses to find it) leaves every GeoJSON source pending forever with no
 * console error: the raster basemap and the province pins still appear, so the
 * view looks alive while provinces, districts and notice parcels are silently
 * absent. These tests pin the sources themselves, not the screenshot.
 */

test("every vector source in the Land view parses", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?view=atlas");
  await page
    .locator(".terrain-canvas canvas")
    .waitFor({ state: "visible", timeout: 30_000 });
  expect(await findLiveMap(page)).toBe(true);

  const counts = await waitForVectorFeatures(
    page,
    ["provinces", "districts", "rivers", "notice-parcels"],
    // Rivers and notice parcels sit off the default country view, so only the
    // boundary sources can be asked for viewport tiles. All four must parse.
    ["provinces", "districts"],
  );
  for (const source of ["provinces", "districts"]) {
    expect(counts[source], `${source} parsed no features`).toBeGreaterThan(0);
  }
});

test("the district fills render inside a chosen province", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?view=atlas&at=province:LP");
  await page
    .locator(".terrain-canvas canvas")
    .waitFor({ state: "visible", timeout: 30_000 });
  expect(await findLiveMap(page)).toBe(true);
  await waitForVectorFeatures(page, ["provinces", "districts"]);

  await page.waitForFunction(() => {
    const map = (window as unknown as { __liveMap?: unknown }).__liveMap as {
      getZoom: () => number;
    };
    return map.getZoom() > 7.5;
  });

  const rendered = await page.evaluate(() => {
    const map = (window as unknown as { __liveMap?: unknown }).__liveMap as {
      queryRenderedFeatures: (
        box: [[number, number], [number, number]],
        options: { layers: string[] },
      ) => unknown[];
    };
    return {
      districts: map.queryRenderedFeatures(
        [
          [300, 200],
          [1400, 800],
        ],
        { layers: ["district-fill"] },
      ).length,
    };
  });
  expect(rendered.districts, "district fills did not render").toBeGreaterThan(0);
});
