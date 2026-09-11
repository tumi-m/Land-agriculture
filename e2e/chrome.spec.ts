import { test } from "@playwright/test";
import { expectNoOverlap } from "./helpers/overlap";

/**
 * The chrome-overlap gate. The full [data-overlay], [data-chrome] scope lands
 * with the P3.1 explorer shell; this spec pins what already holds today: the
 * top-level regions the two layouts render must not intersect.
 */
const CHROME = [".app-header", ".workspace", ".reference-area"].join(", ");

test("phone chrome does not overlap at 390x844", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .locator("canvas, .anatomy-loading")
    .first()
    .waitFor({ state: "visible", timeout: 20_000 });
  await expectNoOverlap(page, CHROME);
});

test("desktop chrome does not overlap at 1440x900", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page
    .locator("canvas, .anatomy-loading")
    .first()
    .waitFor({ state: "visible", timeout: 20_000 });
  await expectNoOverlap(page, CHROME);
});