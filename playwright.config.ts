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
  retries: 0,
  workers: 1,
  expect: { timeout: 20_000 },
  use: {
    baseURL: "http://localhost:3100",
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
  webServer: {
    command: "npm run dev -- -p 3100",
    port: 3100,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});