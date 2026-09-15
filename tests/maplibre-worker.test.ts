import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { MAPLIBRE_WORKER_URL } from "../src/lib/maplibre-worker";

/**
 * The MapLibre worker is copied from node_modules into public/ by
 * `npm run data:worker`. These checks keep the copy honest: if the library is
 * upgraded without re-running the script, the bytes diverge and this fails
 * before an empty Land view reaches anyone.
 */

const PUBLIC_DIR = "public/maplibre";
const DIST_DIR = "node_modules/maplibre-gl/dist";

test("the served worker URL points at files that exist", () => {
  assert.equal(MAPLIBRE_WORKER_URL, "/maplibre/maplibre-gl-worker.mjs");
  const file = join("public", MAPLIBRE_WORKER_URL.replace(/^\//, ""));
  assert.ok(readFileSync(file).length > 0, `${file} is empty`);
  assert.ok(
    readFileSync(join(PUBLIC_DIR, "maplibre-gl-shared.mjs")).length > 0,
    "the worker's shared sibling is missing",
  );
});

test("the public worker is byte-identical to the installed library", () => {
  for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
    const served = readFileSync(join(PUBLIC_DIR, file));
    const installed = readFileSync(join(DIST_DIR, file));
    assert.ok(
      served.equals(installed),
      `${file} differs from node_modules; run npm run data:worker`,
    );
  }
});

test("the recorded worker version matches the installed maplibre-gl", () => {
  const recorded = JSON.parse(
    readFileSync(join(PUBLIC_DIR, "version.json"), "utf8"),
  ) as { package: string; version: string };
  const installed = JSON.parse(
    readFileSync(join("node_modules/maplibre-gl/package.json"), "utf8"),
  ) as { version: string };
  assert.equal(recorded.package, "maplibre-gl");
  assert.equal(
    recorded.version,
    installed.version,
    "the worker was copied from a different maplibre-gl version",
  );
});

test("the worker imports only its shared sibling", () => {
  const worker = readFileSync(join(PUBLIC_DIR, "maplibre-gl-worker.mjs"), "utf8");
  const imports = [...worker.matchAll(/from\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(imports.length > 0, "the worker has no imports, which is unexpected");
  for (const specifier of imports) {
    assert.ok(
      specifier.startsWith("./maplibre-gl-shared"),
      `the worker imports ${specifier}, which public/maplibre/ does not serve`,
    );
  }
});
