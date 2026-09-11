/** Dependency rules for the Asbonge Land Locator. Run with `npm run graph`. */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment:
        "A cycle makes the dependency graph unreadable and breaks tree-shaking. Break the cycle by extracting shared types or helpers.",
      from: {},
      to: { circular: true },
    },
    {
      name: "maplibre-stays-in-map-components",
      severity: "error",
      comment:
        "MapLibre is configured inside the designated map components. Everything else reads LayerDefs and store state. (Until P1.5 lands, AtlasMap and InfrastructureOverlay are the designated homes.)",
      from: { path: "^src", pathNot: ["^src/components/AtlasMap.tsx", "^src/components/InfrastructureOverlay.tsx"] },
      to: { dependencyTypes: ["core", "localmodule"], path: "maplibre-gl" },
    },
    {
      name: "three-stays-in-scene-components",
      severity: "error",
      comment:
        "three.js belongs to the 3D components. Other modules never touch the renderer. (Until P3.3 lands, ExplodedMap and LandScene are the designated homes.)",
      from: { path: "^src", pathNot: ["^src/components/ExplodedMap.tsx", "^src/components/LandScene.tsx"] },
      to: { dependencyTypes: ["core", "localmodule"], path: "three" },
    },
    {
      name: "state-stays-dependency-free",
      severity: "error",
      comment:
        "src/state is the explorer's spine: the store and URL grammar may import types and constants, but never components, scene or map code.",
      from: { path: "^src/state" },
      to: {
        path: ["^src/components", "^src/scene", "^src/map", "^src/features"],
      },
    },
    {
      name: "no-orphan-files",
      severity: "warn",
      comment:
        "A file nothing imports and that imports nothing is either dead code or an entry point. Decide which; delete it or wire it up.",
      from: {
        orphan: true,
        pathNot: [
          "^src/app",
          "^scripts",
          "\\.d\\.ts$",
          "^src/components/blocks",
        ],
      },
      to: {},
    },
    {
      name: "no-unreachable-from-entry",
      severity: "warn",
      comment:
        "Code that no route, script or test reaches is dead weight in the bundle. Entry points (routes, scripts, type leaves) are excluded from being judged.",
      from: {},
      to: { path: "^src", reachable: false, pathNot: ["^src/app"] },
    },
    {
      name: "content-is-a-leaf",
      severity: "warn",
      comment:
        "src/content holds facts. It may not pull in app behaviour, so the data stays portable to scripts and build-time pipelines.",
      from: { path: "^src/content" },
      to: {
        path: [
          "^src/app",
          "^src/components",
          "^src/scene",
          "^src/map",
          "^src/features",
        ],
      },
    },
    {
      name: "data-is-a-leaf",
      severity: "warn",
      comment:
        "src/data holds baked facts. Same rule as src/content: facts, not behaviour.",
      from: { path: "^src/data" },
      to: {
        path: [
          "^src/app",
          "^src/components",
          "^src/scene",
          "^src/map",
          "^src/features",
        ],
      },
    },
  ],
  options: {
    doNotFollow: ["node_modules", "\\.json$"],
    tsConfig: { fileName: "tsconfig.json" },
    // Count type-only imports as real edges, so leaf modules and orphans are
    // judged on everything they touch, not just runtime imports.
    tsPreCompilationDeps: true,
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};