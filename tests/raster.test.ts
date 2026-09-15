import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { PNG } from "pngjs";
import {
  decodeRasterChannel,
  sampleRaster,
  type Raster,
  type RasterMeta,
} from "../src/lib/raster";

/**
 * Relational checks on the baked rasters in public/data/layers/. They assert
 * relationships rather than exact values: the sources carry genuine gaps
 * (SoilGrids returns null over parts of Johannesburg) and resampling shifts
 * a cell here and there, but the physics does not move.
 */

const DIR = "public/data/layers";
const LAYERS = ["landcover", "rain", "soil-ph", "soil-clay", "hillshade"] as const;

function load(layer: string): Raster {
  const meta = JSON.parse(
    readFileSync(join(DIR, `${layer}.json`), "utf8"),
  ) as RasterMeta;
  const png = PNG.sync.read(readFileSync(join(DIR, `${layer}.values.png`)));
  return {
    ...meta,
    values: decodeRasterChannel(
      new Uint8ClampedArray(png.data),
      png.width,
      png.height,
      meta,
    ),
  };
}

test("every baked layer decodes with the app decoder and stays under 600 KB", () => {
  for (const layer of LAYERS) {
    const raster = load(layer);
    assert.equal(raster.width * raster.height, raster.values.length);
    for (const suffix of ["values.png", "color.png"]) {
      const path = join(DIR, `${layer}.${suffix}`);
      const kb = statSync(path).size / 1024;
      assert.ok(kb < 600, `${path} is ${kb.toFixed(0)} KB, over the 600 KB budget`);
    }
  }
});

test("no source nodata marker leaks through as a value", () => {
  for (const layer of LAYERS) {
    const raster = load(layer);
    let leaked = 0;
    for (const value of raster.values) {
      if (value === -9999 || value === -32768) leaked += 1;
    }
    assert.equal(leaked, 0, `${layer} carries ${leaked} leaked nodata cells`);
  }
});

test("rain is dry at Upington, wet at Pietermaritzburg, missing at sea", () => {
  const rain = load("rain");
  const upington = sampleRaster(rain, 21.25, -28.45);
  const pietermaritzburg = sampleRaster(rain, 30.38, -29.6);
  const ocean = sampleRaster(rain, 17.0, -34.5);
  assert.ok(Number.isFinite(upington), "Upington should be on land");
  assert.ok(Number.isFinite(pietermaritzburg), "Pietermaritzburg should be on land");
  assert.ok(upington < 350, `Upington rain ${upington} mm should be under 350`);
  assert.ok(
    upington < pietermaritzburg,
    `Upington ${upington} mm should be drier than Pietermaritzburg ${pietermaritzburg} mm`,
  );
  assert.ok(Number.isNaN(ocean), "ocean cells decode as missing, not zero");
});

test("land cover at central Johannesburg is built-up", () => {
  const landcover = load("landcover");
  const johannesburg = sampleRaster(landcover, 28.047, -26.204);
  assert.equal(johannesburg, 50, "central Johannesburg should be class 50 (Built-up)");
  const kruger = sampleRaster(landcover, 31.55, -23.99);
  assert.equal(kruger, 20, "central Kruger should be class 20 (Shrubland)");
  for (const value of landcover.values) {
    if (Number.isNaN(value)) continue;
    assert.ok(
      value in (landcover.legend ?? {}),
      `land cover class ${value} is not in the legend`,
    );
  }
});

test("topsoil pH is higher at Upington than at Pietermaritzburg", () => {
  const ph = load("soil-ph");
  const upington = sampleRaster(ph, 21.25, -28.45);
  const pietermaritzburg = sampleRaster(ph, 30.38, -29.6);
  assert.ok(Number.isFinite(upington), "Upington pH should be recorded");
  assert.ok(Number.isFinite(pietermaritzburg), "Pietermaritzburg pH should be recorded");
  assert.ok(
    upington > pietermaritzburg,
    `Upington pH ${upington} should be higher than Pietermaritzburg ${pietermaritzburg}`,
  );
  for (const value of ph.values) {
    if (Number.isNaN(value)) continue;
    assert.ok(value >= 3 && value <= 10, `pH ${value} outside 3–10`);
  }
});

test("clay content stays inside its physical range", () => {
  const clay = load("soil-clay");
  let recorded = 0;
  for (const value of clay.values) {
    if (Number.isNaN(value)) continue;
    recorded += 1;
    assert.ok(value >= 0 && value <= 1000, `clay ${value} g/kg outside 0–1000`);
  }
  assert.ok(recorded > clay.values.length / 2, "most clay cells should be recorded");
});
