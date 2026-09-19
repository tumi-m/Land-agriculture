import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  // The measurement specs are deliberate, slow runs (`npm run quality`,
  // `npm run perf`) that use playwright.measure.config.ts; they must not
  // ride the CI gate, and a plain `testIgnore` would also block their
  // explicit invocation.
  testIgnore: ["e2e/quality.spec.ts", "e2e/perf.spec.ts"],
  // Playwright wipes this directory at the start of a run; the committed
  // perf baseline lives under it, so keep artifacts elsewhere.
  outputDir: "test-results/artifacts",
  timeout: 60_000,
  // A software rasteriser on a shared runner stalls at random points, and the
  // failing set differs run to run. A retry is not a pass: the test still has
  // to succeed, and a fault that reproduces still fails the gate. Locally,
  // where a stall is a real finding, there is no retry.
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  expect: { timeout: 20_000 },
  use: {
    baseURL: "http://localhost:3100",
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
  webServer: {
    // CI serves the production build. `next dev` compiles each route on its
    // first request, and on a two-core runner that lands on top of software
    // rendering — the page is still being built when the first assertion
    // waits on it. Locally `dev` stays, so the loop keeps its fast edit cycle.
    command: process.env.CI
      ? "npm run start -- -p 3100"
      : "npm run dev -- -p 3100",
    port: 3100,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});