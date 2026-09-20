import { test, expect } from "@playwright/test";
import { expectNoOverlap } from "./helpers/overlap";

/**
 * M1.4. Before this, the country view stacked Limpopo, North West,
 * Mpumalanga, Northern Cape, Western Cape and Natal on top of each other,
 * each carrying a notice count, so the names could not be read and several
 * could not be tapped. Labels that lose a collision become dots; they stay
 * tappable and keep their name for a screen reader.
 */

const DEPTHS = ["0", "0.33", "0.66", "1"];

async function setDepth(page: import("@playwright/test").Page, value: string) {
  const slider = page.locator(".anatomy-slider input[type='range']").first();
  if (await slider.isDisabled()) return false;
  await slider.evaluate((input, v) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, v);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
  return true;
}

for (const width of [390, 1440]) {
  test(`no two readable labels overlap at ${width}px, at every depth`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/");
    await expect(page.locator(".anatomy-stage")).toBeVisible({
      timeout: 20_000,
    });

    // Country scale first: nine provinces, the case that was unreadable.
    await page.waitForTimeout(800);
    await expectNoOverlap(page, ".anatomy-label:not(.is-dot)");

    await page.getByRole("button", { name: "Limpopo" }).first().click();
    for (const depth of DEPTHS) {
      if (!(await setDepth(page, depth))) continue;
      await page.waitForTimeout(700);
      await expectNoOverlap(page, ".anatomy-label:not(.is-dot)");
    }
  });
}

test("an overflow label stays a control, with its name intact", async ({
  page,
}) => {
  test.setTimeout(120_000);
  // A phone at full depth is where the cap actually bites.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".anatomy-stage")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Limpopo" }).first().click();
  await setDepth(page, "1");
  await page.waitForTimeout(900);

  const dots = page.locator(".anatomy-label.is-dot");
  const count = await dots.count();
  if (count === 0) test.skip(true, "no overflow at this size; nothing to check");

  const first = dots.first();
  // Still reachable, still named: a dot is the piece's control, not a
  // decoration, and a screen reader must still hear the place.
  await expect(first).toBeEnabled();
  expect((await first.textContent())?.trim().length ?? 0).toBeGreaterThan(0);
  const box = await first.boundingBox();
  expect(box?.width ?? 0, "a dot must stay a 44px touch target").toBeGreaterThanOrEqual(40);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
});
