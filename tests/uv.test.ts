import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { worldToLonLat } from "../src/lib/dem";
import {
  LAYER_GRID,
  sceneBounds,
  sceneUv,
  setPlanarUv,
  sourceRow,
} from "../src/scene/textures";
import LANDCOVER from "../public/data/layers/landcover.json";
import SOIL from "../public/data/layers/soil-ph.json";
import RAIN from "../public/data/layers/rain.json";

/**
 * The slices wear rasters that are longitude/latitude grids on a model drawn
 * in Mercator. A pixel in the wrong place would be a measurement shown over
 * the wrong land, so the mapping is pinned here.
 */

const close = (a: number, b: number, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("every draped layer is baked on the grid the texture mapping assumes", () => {
  for (const layer of [LANDCOVER, SOIL, RAIN]) {
    assert.equal(layer.west, LAYER_GRID.west);
    assert.equal(layer.east, LAYER_GRID.east);
    assert.equal(layer.south, LAYER_GRID.south);
    assert.equal(layer.north, LAYER_GRID.north);
  }
});

test("the grid's corners map to the texture's corners", () => {
  const b = sceneBounds();
  const [nwU, nwV] = sceneUv(b.xWest, b.zNorth, b);
  const [seU, seV] = sceneUv(b.xEast, b.zSouth, b);
  close(nwU, 0);
  close(nwV, 1);
  close(seU, 1);
  close(seV, 0);
});

test("scene bounds agree with the projection the pieces are built in", () => {
  const b = sceneBounds();
  const [lon, lat] = worldToLonLat(b.xWest, b.zNorth)!;
  close(lon, LAYER_GRID.west, 1e-6);
  close(lat, LAYER_GRID.north, 1e-6);
  const [lon2, lat2] = worldToLonLat(b.xEast, b.zSouth)!;
  close(lon2, LAYER_GRID.east, 1e-6);
  close(lat2, LAYER_GRID.south, 1e-6);
});

test("resampled rows put each latitude where Mercator puts it, not where a linear map would", () => {
  const rows = 797;
  // Ends: the first and last output rows come from the first and last source rows.
  assert.ok(Math.abs(sourceRow(0, rows, rows)) < 1);
  assert.ok(Math.abs(sourceRow(rows - 1, rows, rows) - (rows - 1)) < 1);
  // Monotonic north to south.
  let previous = -Infinity;
  for (let r = 0; r < rows; r += 10) {
    const s = sourceRow(r, rows, rows);
    assert.ok(s > previous);
    previous = s;
  }
  // Mercator stretches more toward the south, so the middle of the scene
  // span lies south of the middle latitude: a linear mapping would be off
  // by several rows there — kilometres on the ground.
  const middle = sourceRow((rows - 1) / 2, rows, rows);
  assert.ok(middle > (rows - 1) / 2 + 5, `middle row ${middle}`);
  // And that source row really is the latitude at that scene position.
  const b = sceneBounds();
  const z = (b.zNorth + b.zSouth) / 2;
  const lat = worldToLonLat(b.xWest, z)![1];
  const expected =
    ((LAYER_GRID.north - lat) / (LAYER_GRID.north - LAYER_GRID.south)) * rows - 0.5;
  assert.ok(Math.abs(middle - expected) < 0.6);
});

test("a vertex over Johannesburg reads the texel over Johannesburg", () => {
  const [lon, lat] = [28.05, -26.2];
  const b = sceneBounds();
  // Longitude is linear in Mercator x.
  const x =
    b.xWest + ((lon - LAYER_GRID.west) / (LAYER_GRID.east - LAYER_GRID.west)) * (b.xEast - b.xWest);
  // Latitude is not: find the scene z through the same inverse the relief uses.
  let zLo = b.zNorth;
  let zHi = b.zSouth;
  for (let i = 0; i < 60; i++) {
    const mid = (zLo + zHi) / 2;
    if (worldToLonLat(x, mid)![1] > lat) zLo = mid;
    else zHi = mid;
  }
  // A piece's geometry is built around its own centre; the origin puts the
  // vertex back where it belongs.
  const origin = { x: x - 1, z: (zLo + zHi) / 2 - 2 };
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array([1, 0.6, 2]), 3),
  );
  setPlanarUv(geometry, origin);
  const [u, v] = geometry.getAttribute("uv").array as Float32Array;
  close(u, (lon - LAYER_GRID.west) / (LAYER_GRID.east - LAYER_GRID.west), 1e-5);
  // v is in Mercator spacing: the resampled row at 1 - v comes from the
  // source row for Johannesburg's latitude.
  const rows = 797;
  const src = sourceRow((1 - v) * rows - 0.5, rows, rows);
  const expected =
    ((LAYER_GRID.north - lat) / (LAYER_GRID.north - LAYER_GRID.south)) * rows - 0.5;
  assert.ok(Math.abs(src - expected) < 0.6, `${src} vs ${expected}`);
});
