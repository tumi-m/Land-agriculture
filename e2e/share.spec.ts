import { test, expect } from "@playwright/test";

test("a link to the site or the guide unfurls into its share card", async ({ page, request }) => {
  for (const [path, card] of [
    ["/", "/opengraph-image"],
    ["/guide", "/guide/opengraph-image"],
  ]) {
    await page.goto(path);
    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(image).toContain(card);
    const response = await request.get(card);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    expect((await response.body()).byteLength).toBeGreaterThan(10_000);
  }
});

test("interface sounds start off, turn on, and stay on after a reload", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Interface sounds" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "Interface sounds" })).toHaveAttribute("aria-pressed", "true");
});

test("the sound cues are served in both formats", async ({ request }) => {
  for (const cue of ["open", "close", "select"]) {
    // WebM is served under its container's general type, which browsers
    // play as audio when it holds only an audio track.
    for (const [ext, type] of [
      ["webm", /^(audio|video)\/webm$/],
      ["mp3", /^audio\/mpeg$/],
    ] as const) {
      const response = await request.get(`/sounds/${cue}.${ext}`);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toMatch(type);
    }
  }
});
