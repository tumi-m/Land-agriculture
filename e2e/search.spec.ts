import { test, expect } from "@playwright/test";

test("slash opens search, and Enter opens the district it finds", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".anatomy-stage[data-settled='true']")).toBeVisible({ timeout: 20_000 });
  await page.locator("body").press("/");
  const dialog = page.getByRole("dialog", { name: "Search places and lease notices" });
  await expect(dialog).toBeVisible();
  const box = dialog.getByRole("combobox");
  await expect(box).toBeFocused();
  await box.fill("vhembe");
  await expect(dialog.getByRole("option").first()).toContainText("Vhembe");
  await expect(dialog.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
  await box.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/at=district(:|%3A)LP(:|%3A)vhembe-district/);
});

test("arrows move through results, and a farm use finds its notices", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search places and lease notices" }).click();
  const dialog = page.getByRole("dialog", { name: "Search places and lease notices" });
  const box = dialog.getByRole("combobox");
  await box.fill("poultry");
  const options = dialog.getByRole("option");
  await expect(options.first()).toContainText(/poultry/i);
  expect(await options.count()).toBeGreaterThan(1);
  await box.press("ArrowDown");
  await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(box).toHaveAttribute("aria-activedescendant", (await options.nth(1).getAttribute("id"))!);
  await box.press("Enter");
  await expect(page).toHaveURL(/at=notice/);
});

test("pasted coordinates open the point, and a point abroad says so", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search places and lease notices" }).click();
  const dialog = page.getByRole("dialog", { name: "Search places and lease notices" });
  const box = dialog.getByRole("combobox");
  await box.fill("51.5074, -0.1278");
  await expect(dialog.getByRole("status")).toHaveText("That point is outside South Africa.");
  await box.fill("23.8391 S 30.3521 E");
  await box.press("Enter");
  await expect(page).toHaveURL(/at=point(:|%3A)30\.35210(,|%2C)-23\.83910/);
});

test("Escape closes search and gives focus back", async ({ page }) => {
  await page.goto("/");
  const opener = page.getByRole("button", { name: "Search places and lease notices" });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Search places and lease notices" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});
