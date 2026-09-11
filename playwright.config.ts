import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
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