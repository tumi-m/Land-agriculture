/**
 * The studio renders the app's own data and geometry, so its bundle resolves
 * the app's `@/` alias to ../src, the same way the app does.
 */
import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("angle");
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias ?? {}),
      "@": path.resolve(process.cwd(), "../src"),
    },
  },
}));
