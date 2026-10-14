import { test, expect } from "@playwright/test";

test("the guide shows the launch film without downloading it, with its words beside it", async ({ page, request }) => {
  const fetched: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/media/launch")) fetched.push(r.url());
  });
  await page.goto("/guide");
  const film = page.locator("video.film-tour-video");
  await expect(film).toBeVisible();
  await expect(film).toHaveAttribute("preload", "none");
  await expect(film).toHaveAttribute("poster", "/media/launch-poster.jpg");
  // Only the poster loads with the page; the film waits to be played.
  await page.waitForLoadState("networkidle");
  expect(fetched.filter((u) => !u.endsWith(".jpg"))).toEqual([]);

  for (const [path, type] of [
    ["/media/launch.webm", /^video\/webm$/],
    ["/media/launch-720p.mp4", /^video\/mp4$/],
    ["/media/launch-poster.jpg", /^image\/jpeg$/],
  ] as const) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"]).toMatch(type);
  }

  // Everything the film says, as text, each figure with its source.
  const beats = page.locator("#film-tour-summary > li");
  await expect(beats).toHaveCount(3);
  await expect(beats.nth(0)).toContainText(/\d+ provinces and \d+ districts/);
  await expect(beats.nth(1)).toContainText(/\d+ of \d+ reviewed lease notices/);
  await expect(beats.nth(1)).toContainText("Pins mark districts, not farms.");
  await expect(beats.nth(2)).toContainText(/About \d+ days/);
  for (let i = 0; i < 3; i++) await expect(beats.nth(i).locator(".source-note")).toBeVisible();
});
