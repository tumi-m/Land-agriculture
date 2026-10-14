import { test, expect } from "@playwright/test";

test("the outline lists every district with its figures, sources and notices", async ({ page }) => {
  await page.goto("/outline");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The land, as text");
  // Nine provinces, one table each, and every district a row.
  await expect(page.locator("table.outline-table")).toHaveCount(9);
  await expect(page.locator("table.outline-table tbody tr")).toHaveCount(52);
  // Sources are stated once, with dates and resolutions.
  const sources = page.locator(".outline-sources");
  for (const what of ["Rainfall", "Soil pH", "Main land cover", "Lease notices"]) {
    await expect(sources).toContainText(what);
  }
  await expect(sources).toContainText("CHIRPS");
  await expect(sources).toContainText("SoilGrids");
  await expect(sources).toContainText("WorldCover");
  // A known district reads as numbers, with units in the column heads.
  const vhembe = page.locator("tr", { has: page.getByRole("link", { name: "Vhembe District" }) });
  await expect(vhembe.locator("td").nth(1)).toHaveText(/^\d[\d\s]*$/);
  await expect(vhembe.locator("td").nth(2)).toHaveText(/^\d\.\d · /);
  await expect(page.locator("thead").first()).toContainText("mm/year");
  // No blank cells, no NaN.
  await expect(page.locator(".outline-table td").filter({ hasText: /NaN|undefined/ })).toHaveCount(0);
  // Notices awaiting a district are listed, not dropped.
  await expect(page.locator("#outline-awaiting")).toBeVisible();
});

test("a district in the outline opens in the model, from the keyboard", async ({ page }) => {
  await page.goto("/outline");
  const link = page.getByRole("link", { name: "Vhembe District" });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/at=district(:|%3A)LP(:|%3A)vhembe-district/);
});
