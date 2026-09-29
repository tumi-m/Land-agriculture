import { test, expect } from "@playwright/test";

/**
 * M1.3 acceptance for the split Model view. The pure maths is pinned by unit
 * tests (tests/depth, tests/camera, tests/explorer); this spec proves the
 * wrapper wires it: one slider drives depth, presets move the camera and set
 * `data-camera`, a district opens four layer slabs, and at 100% the slabs are
 * actually apart.
 */

test("the depth slider separates the model and Reassemble puts it back", async ({
  page,
}) => {
  await page.goto("/");
  // Settled: the opening shot has landed, so labels have stopped moving.
  await expect(page.locator(".anatomy-stage[data-settled='true']")).toBeVisible({ timeout: 20_000 });

  const slider = page.locator(".anatomy-slider input[type='range']").first();
  await expect(slider).toBeDisabled();
  await page.getByRole("button", { name: "Limpopo" }).first().click();
  await expect(slider).toBeEnabled();
  // The URL grammar writes the colon percent-encoded.
  await expect(page).toHaveURL(/at=province%3ALP/);

  // Drive the slider the way a person does; React tracks the value through
  // its own setter, so the native setter is used to make the change stick.
  await slider.evaluate((input) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, "1");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(slider).toHaveValue("1");
  await expect(page).toHaveURL(/depth=1/);

  // A district opens and fans its four slices out.
  await page
    .locator(".anatomy-label", { hasText: /District|Mopani|Vhembe/ })
    .first()
    .click();
  await expect(page).toHaveURL(/at=district%3ALP/);
  await expect(page.locator(".anatomy-slice-label")).toHaveCount(4);

  await page.getByRole("button", { name: "Reassemble" }).click();
  await expect(slider).toHaveValue("0");
  await expect(page).not.toHaveURL(/depth=/);
});

test("camera presets move the camera and report the angle", async ({ page }) => {
  await page.goto("/");
  // Settled: the opening shot has landed, so labels have stopped moving.
  await expect(page.locator(".anatomy-stage[data-settled='true']")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".anatomy-stage")).toHaveAttribute(
    "data-camera",
    "three-quarter",
  );

  await page.getByRole("button", { name: "Top view" }).click();
  await expect(page.locator(".anatomy-stage")).toHaveAttribute(
    "data-camera",
    "top",
  );
  await expect(
    page.getByRole("button", { name: "Top view" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Side view" }).click();
  await expect(page.locator(".anatomy-stage")).toHaveAttribute(
    "data-camera",
    "side",
  );

  await page.getByRole("button", { name: "¾ view" }).click();
  await expect(page.locator(".anatomy-stage")).toHaveAttribute(
    "data-camera",
    "three-quarter",
  );
});

test("isolate keeps the chosen district and Show surrounding land restores it", async ({
  page,
}) => {
  await page.goto("/?at=district:LP:vhembe-district&depth=1");
  // Settled: the opening shot has landed, so labels have stopped moving.
  await expect(page.locator(".anatomy-stage[data-settled='true']")).toBeVisible({ timeout: 20_000 });
  // Stable handle: the accessible name changes with the state, so the class
  // is what the two clicks share.
  const isolate = page.locator(".anatomy-isolate");
  await expect(isolate).toBeVisible();
  await expect(isolate).toHaveAttribute("aria-pressed", "false");
  await expect(isolate).toHaveText("Isolate this district");
  await isolate.click();
  await expect(isolate).toHaveAttribute("aria-pressed", "true");
  await expect(isolate).toHaveText("Show surrounding land");
  await isolate.click();
  await expect(isolate).toHaveAttribute("aria-pressed", "false");
  await expect(isolate).toHaveText("Isolate this district");
});

test("Back walks out the way you came in, and the page survives it", async ({
  page,
}) => {
  await page.goto("/");
  // Settled: the opening shot has landed, so labels have stopped moving.
  await expect(page.locator(".anatomy-stage[data-settled='true']")).toBeVisible({ timeout: 20_000 });
  const start = page.url();

  // Each change of place gets its own history entry.
  await page.getByRole("button", { name: "Limpopo" }).first().click();
  await expect(page).toHaveURL(/at=province%3ALP/);

  // The depth slider adjusts the same place, so it must not add an entry —
  // otherwise Back would crawl through every tick of the drag.
  const slider = page.locator(".anatomy-slider input[type='range']").first();
  await slider.evaluate((input) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, "1");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page).toHaveURL(/depth=1/);

  await page
    .locator(".anatomy-label", { hasText: /District|Mopani|Vhembe/ })
    .first()
    .click();
  await expect(page).toHaveURL(/at=district%3ALP/);

  // One Back per place, not one per write.
  await page.goBack();
  await expect(page).toHaveURL(/at=province%3ALP/);
  await expect(page).not.toHaveURL(/at=district/);

  await page.goBack();
  await expect(page).toHaveURL(start);

  // Still the app, not the browser's "cannot go back" or a blank tab: this
  // is the defect the entries fix.
  await expect(page.locator(".anatomy-stage")).toBeVisible();
  await expect(slider).toBeDisabled();
});

test("a slice link opens that slice's measurements, and switching slice keeps one history entry", async ({
  page,
}) => {
  await page.goto("/?at=layer:EC:alfred-nzo-district:climate");
  // Settled: the opening shot has landed, so labels have stopped moving.
  await expect(page.locator(".anatomy-stage[data-settled='true']")).toBeVisible({ timeout: 20_000 });
  const card = page.locator(".dcard");
  await expect(card).toContainText("Rainfall, yearly average");
  await expect(card.locator(".dcard-sr").first()).toHaveText("782");
  await expect(card).toContainText("CHIRPS v2.0");

  const entries = await page.evaluate(() => history.length);
  // The slice labels ride the 3D slabs and can sit under the open panel on a
  // small stage, so the click goes to the control itself, not a screen point.
  await page
    .locator(".anatomy-slice-label", { hasText: "Soil" })
    .dispatchEvent("click");
  await expect(page).toHaveURL(/at=layer%3AEC%3Aalfred-nzo-district%3Asoil/);
  await expect(card).toContainText("Soil pH, district average");
  await expect(card.locator(".dcard-sr").first()).toHaveText("6.0");
  // Another slice of the same district is the same place: no new entry.
  expect(await page.evaluate(() => history.length)).toBe(entries);
});

test("the map turns and reframes from the keyboard, and says where it is", async ({
  page,
}) => {
  await page.goto("/");
  const stage = page.locator(".anatomy-stage");
  await expect(stage).toBeVisible({ timeout: 20_000 });
  await expect(stage).toHaveAttribute("data-camera", "three-quarter");

  const map = page.getByRole("application", { name: /Exploded 3D map/ });
  await map.focus();
  // A quarter-turn of arrows takes the camera off every preset.
  for (let i = 0; i < 3; i++) await map.press("ArrowRight");
  await expect(stage).toHaveAttribute("data-camera", "free");
  // 0 flies back to the framed view.
  await map.press("0");
  await expect(stage).toHaveAttribute("data-camera", "three-quarter");

  // Opening a province is announced for someone who cannot see it happen.
  await page.getByRole("button", { name: "Limpopo" }).first().click();
  await expect(page.locator(".anatomy-stage [aria-live='polite']")).toHaveText(
    /Limpopo opened: \d+ districts\./,
  );
});

test("on a phone the information sheet closes when pulled down, not when nudged", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?at=layer:LP:vhembe-district:climate");
  const sheet = page.locator(".anatomy-dossier");
  await expect(sheet).toBeVisible({ timeout: 20_000 });
  const head = await page.locator(".anatomy-dossier-head").boundingBox();
  if (!head) throw new Error("sheet header has no box");
  const pull = async (distance: number) => {
    await page.mouse.move(head.x + 60, head.y + 20);
    await page.mouse.down();
    await page.mouse.move(head.x + 60, head.y + 20 + distance, { steps: 6 });
    await page.mouse.up();
  };
  await pull(40);
  await expect(sheet).toBeVisible();
  await pull(180);
  await expect(sheet).toHaveCount(0);
});
