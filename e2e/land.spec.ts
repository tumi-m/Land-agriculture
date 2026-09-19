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

/**
 * M0.5 · Land-view behaviour inventory.
 *
 * Pins what the Land view does today, before M3 changes it: which floating
 * controls exist on a phone, what a tap does at country scale versus inside a
 * province, and how a failed basemap tile presents itself. This is M3's
 * acceptance surface — M3.3 may change the control set, and this spec must be
 * updated in the same diff that does.
 *
 * Measured against the build of 15 September 2026. One behaviour is recorded
 * as a defect rather than pinned; see the note above the last test.
 */

/** The floating controls over the stage, in the order the CSS stacks them. */
const PHONE_CONTROLS = [
  ".terrain-navigation",
  ".map-inspection-toggle",
  ".terrain-detail-status",
  ".terrain-layers-toggle",
  ".terrain-aerial-toggle",
  ".terrain-readout",
];

/**
 * The at= selection kind, decoded. The address bar percent-encodes the colon,
 * so matching the raw URL string would be a test of encoding, not behaviour.
 */
async function atKind(page: import("@playwright/test").Page) {
  return page.evaluate(
    () =>
      new URLSearchParams(window.location.search).get("at")?.split(":")[0] ??
      null,
  );
}

test("the Land view exposes its controls on a phone", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=atlas&at=province:LP");
  await page
    .locator(".terrain-canvas canvas")
    .waitFor({ state: "visible", timeout: 30_000 });

  // Named controls a person can actually operate.
  for (const name of [
    "Zoom in",
    "Zoom out",
    "Rotate left",
    "Rotate right",
    "Reset regional view",
  ]) {
    await expect(page.getByRole("button", { name })).toBeVisible();
  }
  // The 2D/3D switch is labelled by its own text, not an aria-label.
  await expect(
    page.getByRole("button", { name: "2D", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Map layers/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Aerial close-up/ }),
  ).toBeVisible();

  // Every control in the inventory is on screen at this size.
  for (const selector of PHONE_CONTROLS) {
    await expect(page.locator(selector).first()).toBeVisible();
  }
});

test("country-scale tap inspects a point, not a district", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?view=atlas");
  await page
    .locator(".terrain-canvas canvas")
    .waitFor({ state: "visible", timeout: 30_000 });
  expect(await findLiveMap(page)).toBe(true);
  await waitForVectorFeatures(page, ["provinces"]);

  // Inspect mode is on by default. Tap a point where the canvas is the
  // topmost element and a province fill sits under it — the province label
  // pins are buttons over the map and would swallow a centre tap.
  const target = await page.evaluate(() => {
    const map = (window as unknown as { __liveMap: unknown }).__liveMap as {
      queryRenderedFeatures: (
        point: [number, number],
        options: { layers: string[] },
      ) => unknown[];
    };
    for (let x = 200; x < 1240; x += 80) {
      for (let y = 150; y < 800; y += 60) {
        if (document.elementFromPoint(x, y)?.tagName !== "CANVAS") continue;
        if (
          map.queryRenderedFeatures([x, y], { layers: ["province-fill"] })
            .length
        )
          return { x, y };
      }
    }
    return null;
  });
  expect(target, "no bare canvas over a province").not.toBeNull();

  const box = await page
    .locator(".terrain-canvas canvas")
    .first()
    .boundingBox();
  await page.mouse.click(
    (box?.x ?? 0) + (target?.x ?? 0),
    (box?.y ?? 0) + (target?.y ?? 0),
  );

  // The point dossier opens, and the tap is the selection: the link carries
  // the point so the same spot reopens for whoever it is sent to.
  await expect(page.locator(".map-selection-chip")).toContainText(
    "Selected point",
  );
  await expect
    .poll(() => atKind(page), { timeout: 10_000 })
    .toBe("point");
  const at = await page.evaluate(
    () => new URLSearchParams(window.location.search).get("at") ?? "",
  );
  expect(at, "the point link carries its coordinates").toMatch(
    /^point:-?\d+\.\d+,-?\d+\.\d+$/,
  );
});

test("a district tap inside a province selects the district", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?view=atlas&at=province:LP");
  await page
    .locator(".terrain-canvas canvas")
    .waitFor({ state: "visible", timeout: 30_000 });
  expect(await findLiveMap(page)).toBe(true);
  await waitForVectorFeatures(page, ["provinces", "districts"]);

  // Leave inspect mode so a tap on a district fill selects it.
  await page.getByRole("button", { name: /Click to inspect/ }).click();
  await page.waitForFunction(() => {
    const map = (window as unknown as { __liveMap?: unknown }).__liveMap as {
      getZoom: () => number;
    };
    return map.getZoom() > 7.5;
  });

  const target = await page.evaluate(() => {
    const map = (window as unknown as { __liveMap: unknown }).__liveMap as {
      queryRenderedFeatures: (
        box: [[number, number], [number, number]],
        options: { layers: string[] },
      ) => unknown[];
      project: (lngLat: [number, number]) => { x: number; y: number };
      getCenter: () => { lng: number; lat: number };
    };
    const features = map.queryRenderedFeatures(
      [
        [200, 150],
        [1200, 750],
      ],
      { layers: ["district-fill"] },
    );
    if (!features.length) return null;
    const point = map.project([map.getCenter().lng, map.getCenter().lat]);
    return { x: point.x, y: point.y };
  });
  expect(target, "no district fill under the viewport").not.toBeNull();

  const box = await page
    .locator(".terrain-canvas canvas")
    .first()
    .boundingBox();
  await page.mouse.click(
    (box?.x ?? 0) + (target?.x ?? 0),
    (box?.y ?? 0) + (target?.y ?? 0),
  );

  await expect.poll(() => atKind(page)).toBe("district");
  await expect(page.locator(".map-selection-chip")).toContainText(
    "Region selected",
  );
});

test("a basemap that fails mid-session says so and keeps the land", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?view=atlas");
  await page
    .locator(".terrain-canvas canvas")
    .waitFor({ state: "visible", timeout: 30_000 });
  expect(await findLiveMap(page)).toBe(true);
  await waitForVectorFeatures(page, ["provinces"]);

  // Let the first load finish, then take the imagery away and move somewhere
  // that needs fresh tiles. Blocking from the very first request is the
  // deadlock recorded in the defect note below and is deliberately not pinned.
  await page.route("**/s2cloudless_3857/**", (route) => route.abort());
  await page.route("**/terrain_3857/**", (route) => route.abort());
  await page.evaluate(() => {
    const map = (window as unknown as { __liveMap: unknown }).__liveMap as {
      flyTo: (options: Record<string, unknown>) => void;
    };
    map.flyTo({ center: [19, -34], zoom: 12, duration: 0 });
  });

  const notice = page.locator(".terrain-notice");
  await expect(notice).toBeVisible({ timeout: 60_000 });
  await expect(notice).toContainText(
    /imagery could not load|relief may be incomplete/,
  );

  // The land itself still draws: a failed basemap is not a failed map.
  const counts = await waitForVectorFeatures(
    page,
    ["provinces", "districts"],
    ["provinces", "districts"],
  );
  expect(counts.provinces).toBeGreaterThan(0);
});

test("imagery that fails from the first request still leaves a usable map", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  // Blocked before the first request: the case that used to deadlock the view.
  await page.route("**/s2cloudless_3857/**", (route) => route.abort());
  await page.route("**/terrain_3857/**", (route) => route.abort());
  await page.goto("/?view=atlas");
  await page
    .locator(".terrain-canvas canvas")
    .waitFor({ state: "visible", timeout: 30_000 });
  expect(await findLiveMap(page)).toBe(true);

  // MapLibre's load event never comes without imagery, so the setup runs on
  // its watchdog instead: the cover lifts and the land layers are added.
  await expect(page.locator(".terrain-loading")).toBeHidden({
    timeout: 60_000,
  });
  const counts = await waitForVectorFeatures(
    page,
    ["provinces", "districts"],
    ["provinces", "districts"],
  );
  expect(counts.provinces, "provinces parsed no features").toBeGreaterThan(0);

  // And it says what went wrong rather than pretending the imagery is coming.
  const notice = page.locator(".terrain-notice");
  await expect(notice).toBeVisible({ timeout: 30_000 });
  await expect(notice).toContainText(
    /imagery could not load|relief may be incomplete|loading slowly/,
  );
});

/*
 * The two defects measured on 15 September 2026 are fixed and pinned above:
 *
 * 1. A country-scale tap now sets the point selection, so the link carries
 *    `at=point:lng,lat` ("country-scale tap inspects a point").
 * 2. Imagery blocked from the first request no longer deadlocks the view: the
 *    setup runs on a watchdog when MapLibre's load event cannot fire, so the
 *    boundaries, notices and controls arrive without it ("imagery that fails
 *    from the first request").
 *
 * Still open, and owned by M3: the model-to-land hand-off, and moving the
 * InfrastructureOverlay layers into the registry.
 */
