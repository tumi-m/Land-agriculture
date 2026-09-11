import { test, expect } from "@playwright/test";

const VIEWS = [
  { name: "phone-light", width: 390, height: 844, scheme: "light" },
  { name: "phone-dark", width: 390, height: 844, scheme: "dark" },
  { name: "desktop-light", width: 1440, height: 900, scheme: "light" },
  { name: "desktop-dark", width: 1440, height: 900, scheme: "dark" },
] as const;

for (const view of VIEWS) {
  test(`the explorer matches its ${view.name} baseline`, async ({ page }) => {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.emulateMedia({ colorScheme: view.scheme });
    await page.goto("/");
    // The first WebGL frame (or its loading state) before the shot.
    await page
      .locator("canvas, .anatomy-loading")
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(600);
    // WebGL under swiftshader varies slightly between runs, so a small
    // pixel ratio is tolerated. Intentional visual changes are accepted
    // with `npm run shots:update`.
    await expect(page).toHaveScreenshot(`${view.name}.png`, {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
      timeout: 20_000,
    });
  });
}