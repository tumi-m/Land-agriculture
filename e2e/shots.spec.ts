import { test, expect } from "@playwright/test";

const VIEWS = [
  { name: "phone-light", width: 390, height: 844, scheme: "light" },
  { name: "phone-dark", width: 390, height: 844, scheme: "dark" },
  { name: "desktop-light", width: 1440, height: 900, scheme: "light" },
  { name: "desktop-dark", width: 1440, height: 900, scheme: "dark" },
] as const;

test("capture the explorer in four states", async ({ browser }) => {
  test.setTimeout(240_000);
  for (const view of VIEWS) {
    const context = await browser.newContext({
      viewport: { width: view.width, height: view.height },
      colorScheme: view.scheme,
    });
    const page = await context.newPage();
    await page.goto("/");
    // The first WebGL frame (or its loading state) before the shot.
    await page
      .locator("canvas, .anatomy-loading")
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: `test-results/shots/${view.name}.png`,
      fullPage: false,
    });
    await context.close();
  }
  expect(VIEWS).toHaveLength(4);
});