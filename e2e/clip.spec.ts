import { test, expect } from "@playwright/test";
import { ALL_FORMATS, FilePathSource, Input } from "mediabunny";

test("the model saves a clip of one full turn, named after the place", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?at=province:LP");
  await expect(page.locator(".anatomy-stage[data-settled='true']")).toBeVisible({ timeout: 20_000 });

  const download = page.waitForEvent("download", { timeout: 200_000 });
  await page.getByRole("button", { name: "Save a 6-second clip" }).click();
  // The stage is covered while frames are drawn at the clip's own size.
  await expect(page.locator(".anatomy-recording")).toBeVisible();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^asbonge-limpopo\.(mp4|webm)$/);

  // Read back independently of the browser: 6 s, every frame, 1280 × 720.
  const input = new Input({ formats: ALL_FORMATS, source: new FilePathSource(await file.path()) });
  const video = await input.getPrimaryVideoTrack();
  expect(video).not.toBeNull();
  expect(await video!.getDisplayWidth()).toBe(1280);
  expect(await video!.getDisplayHeight()).toBe(720);
  expect((await video!.computePacketStats()).packetCount).toBe(180);
  input.dispose();

  // The stage comes back as it was, and says what was saved.
  await expect(page.locator(".anatomy-recording")).toHaveCount(0);
  await expect(page.locator(".anatomy-clip-status")).toHaveText(/^Saved asbonge-limpopo\.(mp4|webm)\.$/);
  const canvas = await page.locator(".anatomy-canvas canvas").boundingBox();
  const host = await page.locator(".anatomy-canvas").boundingBox();
  expect(canvas?.width).toBeCloseTo(host!.width, 0);
  expect(canvas?.height).toBeCloseTo(host!.height, 0);
});
