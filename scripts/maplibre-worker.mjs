/**
 * Copies the MapLibre worker into public/ so the app can point the map at a
 * real URL.
 *
 *   npm run data:worker
 *
 * MapLibre parses GeoJSON and tiles in a module worker it locates through
 * `import.meta.url`. A bundler rewrites `import.meta.url` to the source file's
 * path on the build machine (`file:///…/node_modules/maplibre-gl/dist/…`), and
 * the library then sees a non-http URL, gives up and returns an empty string.
 * The worker is constructed with no script, no GeoJSON is ever parsed, and
 * every vector source stays pending forever, silently, while raster basemaps
 * still draw. Nothing logs an error, which is what made this hard to see.
 *
 * The fix is to serve the worker ourselves and call `setWorkerUrl` before the
 * map is built. The worker is an ES module that imports its sibling
 * `maplibre-gl-shared.mjs`, so both files must sit next to each other; a
 * single-file bundle would not resolve that import.
 *
 * Run at build time only, after any MapLibre upgrade. The copied files are
 * committed with the upgrade so the shipped worker always matches the library
 * the app bundles; `tests/maplibre-worker.test.ts` compares the bytes.
 */
import fs from "node:fs";

const DIST = new URL("../node_modules/maplibre-gl/dist/", import.meta.url);
const OUT = new URL("../public/maplibre/", import.meta.url);
const PACKAGE = new URL("../node_modules/maplibre-gl/package.json", import.meta.url);

const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

const version = JSON.parse(fs.readFileSync(PACKAGE, "utf8")).version;

fs.mkdirSync(OUT, { recursive: true });
for (const file of FILES) {
  const from = new URL(file, DIST);
  if (!fs.existsSync(from)) throw new Error(`maplibre-gl dist is missing ${file}`);
  fs.copyFileSync(from, new URL(file, OUT));
}

// The version the files came from, so a forgotten re-run after an upgrade
// shows up as a mismatch rather than a mystery.
fs.writeFileSync(
  new URL("version.json", OUT),
  JSON.stringify({ package: "maplibre-gl", version }) + "\n",
);

// Fail loudly if the worker stops being one self-contained ES module plus its
// sibling, which is the shape the copy above assumes.
const worker = fs.readFileSync(new URL("maplibre-gl-worker.mjs", OUT), "utf8");
const imports = [...worker.matchAll(/from\s*"([^"]+)"/g)].map((match) => match[1]);
for (const specifier of imports) {
  if (!/^\.\/maplibre-gl-shared(-dev)?\.mjs$/.test(specifier)) {
    throw new Error(
      `maplibre-gl-worker.mjs imports ${specifier}; public/maplibre/ only holds the shared sibling`,
    );
  }
}

const sizes = FILES.map(
  (file) => `${file} ${(fs.statSync(new URL(file, OUT)).size / 1024).toFixed(0)} KB`,
).join(" · ");
console.log(`worker: maplibre-gl ${version} copied to public/maplibre/`);
console.log(`worker: ${sizes}`);
