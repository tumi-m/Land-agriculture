import { test, expect } from "@playwright/test";

test("the explorer loads and the model or its fallback appears", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("canvas, .anatomy-loading").first()).toBeVisible({
    timeout: 20_000,
  });
});

test("choosing Limpopo puts the province in the URL", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Limpopo" }).first().click();
  await expect(page).toHaveURL(/province=LP/);
});