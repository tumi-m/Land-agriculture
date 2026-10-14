import { test, expect } from "@playwright/test";

// A device with no WebGL at all: the model says so and offers the text path.
test.use({ launchOptions: { args: ["--disable-webgl", "--disable-webgl2", "--disable-3d-apis"] } });

test("without WebGL the model falls back, and the outline still works", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("3D rendering is unavailable on this device.")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Read it as an outline" }).click();
  await expect(page).toHaveURL(/\/outline$/);
  await expect(page.locator("table.outline-table tbody tr")).toHaveCount(52);
});
