import { defineConfig } from "@playwright/test";

/**
 * Measurement runs only: `npm run quality` and `npm run perf`. The main
 * playwright.config.ts keeps these specs out of the CI e2e gate, and this
 * config selects just them. Same browser, server and swiftshader flags;
 * output dir is the shared artifacts folder so the committed baselines
 * under test-results/perf/ survive a run.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /(quality|perf)\.spec\.ts/,
  outputDir: "test-results/artifacts",
  timeout: 300_000,
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
