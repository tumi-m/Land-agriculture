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
    {
      name: "browser-code-avoids-node-builtins",
      severity: "warn",
      comment:
        "Components, scene, map and lib code runs in the browser. Reading files is a build-time or server job; promote it to a script or an /api route. Promoted to error when P1.2+ tokens land.",
      from: { path: "^src/(components|scene|map|lib|state|features)" },
      to: {
        dependencyTypes: ["core"],
        path: ["^(fs|path|os|child_process)$"],
      },
    },
    {
      name: "api-routes-are-app-internal",
      severity: "warn",
      comment:
        "Callers reach /api routes over fetch, never by importing their handlers. This keeps validation, timeouts and cache headers the only door in. Promoted to error when P4.x routes land.",
      from: { path: "^src", pathNot: "^src/app" },
      to: { path: "^src/app/api" },
    },
    {
      name: "scripts-reach-lib-content-data-only",
      severity: "warn",
      comment:
        "Build-time scripts may read facts and lib helpers, but never app or component code. scripts/test-explorer.tsx is the test entry and is exempt. Promoted to error with the P2 data pipelines.",
      from: { path: "^scripts", pathNot: "^scripts/test-explorer.tsx" },
      to: {
        path: [
          "^src/app",
          "^src/components",
          "^src/scene",
          "^src/map",
          "^src/features",
          "^src/state",
        ],
      },
    },
    {
      name: "one-state-library",
      severity: "warn",
      comment:
        "Selection state lives in src/state alone. When P1.3 adds zustand, only src/state may import it, so components never bind to a store library directly.",
      from: { path: "^src", pathNot: "^src/state" },
      to: { path: "^zustand" },
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