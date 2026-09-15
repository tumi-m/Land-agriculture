/**
 * The MapLibre worker the app points the map at.
 *
 * MapLibre locates its worker with `import.meta.url`, which the bundler
 * rewrites to a `file://` path, so the library never starts a worker on its
 * own and every GeoJSON source stays pending. `scripts/maplibre-worker.mjs`
 * copies the real worker into `public/maplibre/`; this is the URL it serves.
 * See `tests/maplibre-worker.test.ts`.
 */
export const MAPLIBRE_WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";
