/**
 * Bakes the thematic rasters into public/data/layers/.
 *
 *   node scripts/data/bake-rasters.mjs [--only landcover,rain]
 *
 * Sources and methods live in scripts/data/sources.json (real paths, verified
 * against the live services); colour stops live in scripts/data/raster-colors.json.
 *
 * For each layer it writes:
 *   <layer>.values.png  two bytes per cell, the DEM's convention:
 *                       value = (R × 256 + G) × step − offset.
 *                       R = G = 255 (stored 65535) is reserved for nodata.
 *   <layer>.color.png   the same grid already coloured, so displaying it
 *                       needs no shader.
 *   <layer>.json        bounds, size, step, offset, nodata, units, resolution,
 *                       source, licence, date, and the legend for categories.
 *
 * Grid: EPSG:4326, the same box as the baked DEM, 1024 × 797 cells (under
 * 2 km across). Run at build time only; the app ships the PNGs.
 */
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";

const sources = JSON.parse(readFileSync("scripts/data/sources.json", "utf8"));
const colors = JSON.parse(readFileSync("scripts/data/raster-colors.json", "utf8"));
const OUT_DIR = "public/data/layers";
const GRID = sources.grid;
const WARP_NODATA = -9999;
/** Stored two-byte code reserved for nodata; recorded in every sidecar. */
const STORED_NODATA = 65535;

const onlyArg = process.argv.indexOf("--only");
const only = onlyArg >= 0 ? process.argv[onlyArg + 1].split(",") : null;

const scratch = mkdtempSync(join(tmpdir(), "bake-rasters-"));
mkdirSync(OUT_DIR, { recursive: true });

function run(command, args) {
  execFileSync(
    command,
    ["--config", "GDAL_HTTP_MAX_RETRY", "3", ...args],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
}

/**
 * Warps a band-per-input stack onto the grid. One band per input URL.
 * `srcNodata` is the missing-data marker in the source files; it differs by
 * provider (CHIRPS stores -9999 over ocean without declaring it, SoilGrids
 * declares -32768), so each layer names it in sources.json.
 */
function warp(urls, resample, srcNodata, extra = []) {
  const stack = join(scratch, "stack.vrt");
  // Remote sources need the /vsicurl/ prefix: gdalwarp cannot open a plain
  // https:// path written into a VRT.
  run("gdalbuildvrt", ["-overwrite", "-separate", stack, ...urls.map((url) => `/vsicurl/${url}`)]);
  const tif = join(scratch, "stack.tif");
  run("gdalwarp", [
    "-overwrite",
    "-t_srs", "EPSG:4326",
    "-te", String(GRID.west), String(GRID.south), String(GRID.east), String(GRID.north),
    "-ts", String(GRID.width), String(GRID.height),
    "-r", resample,
    "-ot", "Float32",
    "-dstnodata", String(WARP_NODATA),
    "-srcnodata", String(srcNodata),
    ...extra,
    stack,
    tif,
  ]);
  return tif;
}

/**
 * Warps several remote COGs straight onto the grid as one band: gdalwarp
 * folds multiple inputs into the chosen operation per pixel (mode across
 * tiles). OVERVIEW_LEVEL reads each COG's tier-3 overviews (2,250² per
 * 3°×3° tile, about 140 m a cell) instead of the 36,000² native data, which
 * still resolves far finer than the grid.
 */
function warpUrls(urls, resample, extra = []) {
  const tif = join(scratch, "single.tif");
  run("gdalwarp", [
    "-q",
    "-overwrite",
    "-t_srs", "EPSG:4326",
    "-te", String(GRID.west), String(GRID.south), String(GRID.east), String(GRID.north),
    "-ts", String(GRID.width), String(GRID.height),
    "-r", resample,
    "-ot", "UInt16",
    "-dstnodata", "0",
    "-srcnodata", "0",
    "-oo", "OVERVIEW_LEVEL=3",
    ...extra,
    ...urls.map((url) => `/vsicurl/${url}`),
    tif,
  ]);
  return tif;
}

/** Reads one band of a GeoTIFF out as an ASCII grid. */
function bandAscii(tif, band) {
  const path = join(scratch, `band-${band}.asc`);
  run("gdal_translate", ["-q", "-of", "AAIGrid", "-b", String(band), tif, path]);
  return readAscii(path);
}

function readAscii(path) {
  const lines = readFileSync(path, "utf8").trim().split("\n");
  // GDAL writes a 7-line AAIGrid header (dx/dy) when the grid's cells are
  // non-square, and a 6-line one (cellsize) otherwise; key off the labels
  // instead of counting lines, and read the nodata marker wherever it sits.
  const KEYS = new Set(["ncols", "nrows", "xllcorner", "yllcorner", "cellsize", "dx", "dy", "NODATA_value"]);
  let width = 0;
  let height = 0;
  let nodata = NaN;
  let dataStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const [key, value] = lines[i].trim().split(/\s+/);
    if (!KEYS.has(key)) {
      dataStart = i;
      break;
    }
    if (key === "ncols") width = Number(value);
    if (key === "nrows") height = Number(value);
    if (key === "NODATA_value") nodata = Number(value);
  }
  const values = new Float64Array(width * height);
  for (let row = 0; row < height; row++) {
    const cells = lines[dataStart + row].trim().split(/\s+/);
    for (let col = 0; col < width; col++) {
      const raw = Number(cells[col]);
      // Real zero is a valid value in every layer, so only an exact match to
      // the header's nodata marker counts as missing.
      values[row * width + col] = raw === nodata ? NaN : raw;
    }
  }
  return { width, height, values };
}

/** Weighted mean across bands; a cell is valid only where every band is. */
function combine(bands, weights) {
  const { width, height } = bands[0];
  const values = new Float64Array(width * height);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    for (let band = 0; band < bands.length; band++) {
      const v = bands[band].values[i];
      if (!Number.isFinite(v)) {
        sum = NaN;
        break;
      }
      sum += v * weights[band];
    }
    values[i] = sum / total;
  }
  return { width, height, values };
}

function bakeLandcover(layer) {
  // Multi-input mode folds the overlapping tiles into one band per cell;
  // overviews keep the read off the native 36,000² data.
  const urls = layer.tiles.map((tile) => layer.url.replace("{tile}", tile));
  const tif = warpUrls(urls, "mode");
  return { bands: [bandAscii(tif, 1)], weights: [1] };
}

function bakeRain(layer) {
  const urls = layer.years.map((year) => layer.url.replace("{year}", String(year)));
  const tif = warp(urls, "average", layer.srcNodata);
  const bands = layer.years.map((_, index) => bandAscii(tif, index + 1));
  return { bands, weights: layer.years.map(() => 1) };
}

function bakeSoil(layer) {
  const urls = layer.depths.map(({ slug }) => layer.url.replace("{depth}", slug));
  const tif = warp(urls, "average", layer.srcNodata);
  const bands = layer.depths.map((_, index) => bandAscii(tif, index + 1));
  return { bands, weights: layer.depths.map((depth) => depth.weight) };
}

/**
 * Hillshade from the baked DEM. The DEM carries elevations in metres on a
 * degree grid, so the vertical scale converts degrees to metres at the grid's
 * mean latitude (about 0.0000102).
 */
function bakeHillshade() {
  const demMeta = JSON.parse(readFileSync("public/data/sa-dem.json", "utf8"));
  const png = PNG.sync.read(readFileSync("public/data/sa-dem.png"));
  const metresPerDegree = 111_320 * Math.cos((((demMeta.north + demMeta.south) / 2) * Math.PI) / 180);
  const scale = 1 / metresPerDegree;

  const asc = join(scratch, "dem.asc");
  const lines = [
    `ncols         ${demMeta.width}`,
    `nrows         ${demMeta.height}`,
    `xllcorner     ${demMeta.west}`,
    `yllcorner     ${demMeta.south}`,
    `cellsize      ${(demMeta.east - demMeta.west) / demMeta.width}`,
    `NODATA_value  ${WARP_NODATA}`,
  ];
  for (let row = 0; row < demMeta.height; row++) {
    const cells = [];
    for (let col = 0; col < demMeta.width; col++) {
      const i = (row * demMeta.width + col) * 4;
      const stored = png.data[i] * 256 + png.data[i + 1];
      cells.push(String(stored * demMeta.step - demMeta.offset));
    }
    lines.push(cells.join(" "));
  }
  writeFileSync(asc, lines.join("\n") + "\n");

  const shade = join(scratch, "hillshade.asc");
  run("gdaldem", ["hillshade", "-q", "-z", scale.toFixed(8), asc, shade]);
  return { bands: [readAscii(shade)], weights: [1] };
}

const bakers = {
  landcover: bakeLandcover,
  rain: bakeRain,
  "soil-ph": bakeSoil,
  "soil-clay": bakeSoil,
  hillshade: bakeHillshade,
};

/** The ramp colour nearest to a value; the legend states these stops. */
function nearestStop(stops, value) {
  let best = stops[0][1];
  let bestDistance = Infinity;
  for (const [stopValue, color] of stops) {
    const distance = Math.abs(stopValue - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = color;
    }
  }
  return best;
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

for (const [id, layer] of Object.entries(sources.layers)) {
  if (only && !only.includes(id)) continue;
  console.log(`bake: ${id}`);
  const { bands, weights } = bakers[id](layer);
  const combined = combine(bands, weights);
  // Sources that store a scaled unit (SoilGrids pH is ×10) are divided down
  // to their display unit before quantising, so values, sidecar and colour
  // ramp all speak the same unit.
  const factor = layer.displayFactor ?? 1;
  const { width, height, values } = factor === 1
    ? combined
    : { ...combined, values: combined.values.map((v) => v / factor) };

  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (Number.isFinite(v)) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  const isCategorical = id === "landcover";
  // Categories keep exact class codes; continuous layers store a quantum.
  // The quantum is a value the source honestly carries (a 250 m SoilGrids
  // prediction does not resolve 1 g/kg of clay), capped so the stored code
  // 65535 stays free as the nodata marker. Coarser quanta compress smaller;
  // the sidecar's step and offset record exactly what was stored.
  const span = max - min || 1;
  const quantum = layer.quantum ?? span / 65_534;
  const step = isCategorical ? 1 : Math.max(quantum, span / 65_534);
  const offset = isCategorical ? 0 : -min;

  const valuesPng = new PNG({ width, height, colorType: 6 });
  const colorPng = new PNG({ width, height, colorType: 6 });
  const colorSpec = colors[id];
  const ramp = colorSpec.ramp
    ? colorSpec.ramp.map(([value, hex]) => [value, hexToRgb(hex)])
    : null;
  const classColors = colorSpec.classes
    ? Object.fromEntries(
        Object.entries(colorSpec.classes).map(([code, hex]) => [code, hexToRgb(hex)]),
      )
    : null;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const o = i * 4;
    if (!Number.isFinite(v)) {
      valuesPng.data[o] = 255;
      valuesPng.data[o + 1] = 255;
      valuesPng.data[o + 2] = 0;
      colorPng.data[o] = 0;
      colorPng.data[o + 1] = 0;
      colorPng.data[o + 2] = 0;
      colorPng.data[o + 3] = 0;
      continue;
    }
    const q = Math.round((v + offset) / step);
    if (q < 0 || q >= STORED_NODATA) throw new Error(`bake: ${id} value ${v} outside the encodable range`);
    valuesPng.data[o] = Math.floor(q / 256);
    valuesPng.data[o + 1] = q % 256;
    let rgb;
    if (classColors) {
      rgb = classColors[String(Math.round(v))] ?? [0, 0, 0];
    } else if (ramp) {
      // Snap to the ramp's own stops. A continuous blend would bake hundreds
      // of near-identical colours into the PNG (1 MB per soil layer) without
      // showing anything the legend does not already state.
      rgb = nearestStop(ramp, v);
    } else {
      rgb = [Math.round(v), Math.round(v), Math.round(v)];
    }
    valuesPng.data[o + 2] = 0;
    colorPng.data[o] = rgb[0];
    colorPng.data[o + 1] = rgb[1];
    colorPng.data[o + 2] = rgb[2];
    colorPng.data[o + 3] = 255;
  }

  const meta = {
    layer: id,
    west: GRID.west,
    south: GRID.south,
    east: GRID.east,
    north: GRID.north,
    width,
    height,
    step,
    offset,
    nodata: 255,
    units: layer.units,
    resolution: layer.resolution,
    source: layer.source,
    licence: layer.licence,
    date: layer.date,
  };
  if (isCategorical) {
    meta.legend = layer.classes;
    meta.colors = colorSpec.classes;
  } else if (ramp) {
    meta.colors = colorSpec.ramp;
  }

  const valuesPath = join(OUT_DIR, `${id}.values.png`);
  const colorPath = join(OUT_DIR, `${id}.color.png`);
  writeFileSync(valuesPath, PNG.sync.write(valuesPng, { deflateLevel: 9 }));
  writeFileSync(colorPath, PNG.sync.write(colorPng, { deflateLevel: 9 }));
  writeFileSync(join(OUT_DIR, `${id}.json`), JSON.stringify(meta, null, 2) + "\n");

  const kb = (statSync(valuesPath).size / 1024).toFixed(0);
  console.log(
    `bake: ${id} ${width}×${height} ${min.toFixed(1)}..${max.toFixed(1)} ${layer.units} · values ${kb} KB`,
  );
}

rmSync(scratch, { recursive: true, force: true });
console.log("bake: done");