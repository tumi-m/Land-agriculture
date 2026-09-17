/**
 * Computes per-district statistics into src/data/district-stats.json.
 *
 *   node scripts/data/district-stats.mjs
 *
 * Reads baked artefacts only — the layer grids in public/data/layers/, the DEM
 * in public/data/sa-dem.png, the district boundaries in
 * src/data/sa-districts.topo.json and the notice content — and never touches
 * the network. Grid statistics count the cells whose centre falls inside a
 * district (even-odd point-in-polygon over every ring of the boundary);
 * nodata cells are excluded and a district with only nodata gets null, so
 * consumers can say "Not recorded" instead of inventing a number.
 *
 * Every source, licence, date and resolution string is copied from the real
 * sidecar metadata (public/data/layers/*.json, src/content/notice-coverage.json,
 * src/data/nc-district-evidence.json, scripts/build-topo.mjs), never retyped.
 *
 * d3-geo's geoContains answers one point in about a millisecond — hours over
 * the whole grid — so containment uses the planar even-odd scanline below;
 * South Africa is far from the antimeridian and the poles, where the two
 * disagree. Area keeps the spherical answer: d3-geo geoArea × R².
 */
import { build } from "esbuild";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { geoArea } from "d3-geo";
import { feature } from "topojson-client";

const OUT_FILE = "src/data/district-stats.json";
/** IUGG mean Earth radius, the sphere d3-geo's own measures use. */
const EARTH_RADIUS_KM = 6371.0088;
/** Boundary source, the URL scripts/build-topo.mjs downloads and caches. */
const BOUNDARY_SOURCE =
  "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/south-africa.geojson";
const SAMPLING =
  "Grid cells whose centre falls inside the district boundary (even-odd point-in-polygon over every ring); nodata cells excluded";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/**
 * Decodes a baked *.values.png with the sidecar's convention:
 * value = (R × 256 + G) × step − offset, R = G = nodata is missing.
 */
function decodeValues(pngPath, meta) {
  const png = PNG.sync.read(readFileSync(pngPath));
  if (png.width !== meta.width || png.height !== meta.height) {
    throw new Error(`${pngPath} is ${png.width}×${png.height}, sidecar says ${meta.width}×${meta.height}`);
  }
  const values = new Float64Array(png.width * png.height);
  for (let i = 0; i < values.length; i++) {
    const r = png.data[i * 4];
    const g = png.data[i * 4 + 1];
    values[i] =
      meta.nodata !== undefined && r === meta.nodata && g === meta.nodata
        ? NaN
        : (r * 256 + g) * meta.step - meta.offset;
  }
  return values;
}

/** Flattens a GeoJSON Polygon or MultiPolygon into its rings of [lon, lat]. */
function ringsOf(geometry) {
  const polygons =
    geometry.type === "MultiPolygon"
      ? geometry.coordinates
      : geometry.type === "Polygon"
        ? [geometry.coordinates]
        : null;
  if (!polygons) throw new Error(`unexpected geometry type ${geometry.type}`);
  return polygons.flat();
}

/** Even-odd containment of one point in one district's rings. */
function ringsContain(rings, lon, lat) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [lon1, lat1] = ring[j];
      const [lon2, lat2] = ring[i];
      if (lat1 > lat !== lat2 > lat && lon1 + ((lat - lat1) / (lat2 - lat1)) * (lon2 - lon1) > lon) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/**
 * Assigns every grid cell to the first district (boundary-file order) whose
 * polygon contains the cell centre: a scanline per row collects the ring
 * crossings and fills the even-odd spans between them. Shared borders can put
 * a cell inside two simplified boundaries; first wins, deterministically.
 */
function classifyGrid(districts, meta) {
  const { west, south, east, north, width, height } = meta;
  const dx = (east - west) / width;
  const dy = (north - south) / height;
  const owner = new Int16Array(width * height).fill(-1);
  for (let d = 0; d < districts.length; d++) {
    const { rings, bounds } = districts[d];
    const rowMin = Math.max(0, Math.floor((north - bounds[3]) / dy));
    const rowMax = Math.min(height - 1, Math.ceil((north - bounds[1]) / dy));
    const colMin = Math.max(0, Math.floor((bounds[0] - west) / dx));
    const colMax = Math.min(width - 1, Math.ceil((bounds[2] - west) / dx));
    const crossings = [];
    for (let row = rowMin; row <= rowMax; row++) {
      const lat = north - (row + 0.5) * dy;
      crossings.length = 0;
      for (const ring of rings) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [lon1, lat1] = ring[j];
          const [lon2, lat2] = ring[i];
          if (lat1 > lat === lat2 > lat) continue;
          crossings.push(lon1 + ((lat - lat1) / (lat2 - lat1)) * (lon2 - lon1));
        }
      }
      crossings.sort((a, b) => a - b);
      for (let k = 0; k + 1 < crossings.length; k += 2) {
        const from = Math.max(colMin, Math.ceil((crossings[k] - west) / dx - 0.5));
        const to = Math.min(colMax, Math.floor((crossings[k + 1] - west) / dx - 0.5));
        for (let col = from; col <= to; col++) {
          const i = row * width + col;
          if (owner[i] === -1) owner[i] = d;
        }
      }
    }
  }
  return owner;
}

/** Linear-interpolation quantile (R-7) of an ascending sorted array. */
function quantileSorted(sorted, p) {
  const pos = (sorted.length - 1) * p;
  const low = Math.floor(pos);
  const high = Math.ceil(pos);
  return sorted[low] + (sorted[high] - sorted[low]) * (pos - low);
}

const round = (value, decimals) => Math.round(value * 10 ** decimals) / 10 ** decimals;

/** The source block every raster statistic carries, straight off the sidecar. */
function rasterSource(meta) {
  return {
    source: meta.source,
    licence: meta.licence,
    date: meta.date,
    resolution: meta.resolution,
  };
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Districts, in boundary-file order.
const topo = readJson("src/data/sa-districts.topo.json");
const collection = feature(topo, topo.objects.districts);
const districts = collection.features.map((f) => {
  const rings = ringsOf(f.geometry);
  const lons = rings.flat().map((p) => p[0]);
  const lats = rings.flat().map((p) => p[1]);
  return {
    id: f.properties.id,
    name: f.properties.name,
    province: f.properties.province,
    rings,
    bounds: [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)],
    areaKm2: geoArea(f) * EARTH_RADIUS_KM * EARTH_RADIUS_KM,
  };
});
const byId = new Map(districts.map((d, index) => [d.id, index]));
if (byId.size !== districts.length) throw new Error("duplicate district ids in the boundary file");
console.log(`district-stats: ${districts.length} districts, total area ${Math.round(districts.reduce((sum, d) => sum + d.areaKm2, 0))} km²`);

// Rasters: the four thematic layers share one grid; the DEM has its own.
const layerIds = ["rain", "landcover", "soil-ph", "soil-clay"];
const metas = Object.fromEntries(
  layerIds.map((id) => [id, readJson(`public/data/layers/${id}.json`)]),
);
const grid = metas.rain;
for (const id of layerIds) {
  const m = metas[id];
  if (m.west !== grid.west || m.south !== grid.south || m.east !== grid.east || m.north !== grid.north || m.width !== grid.width || m.height !== grid.height) {
    throw new Error(`${id} and rain do not share one grid`);
  }
}
const values = Object.fromEntries(
  layerIds.map((id) => [id, decodeValues(`public/data/layers/${id}.values.png`, metas[id])]),
);
const demMeta = readJson("public/data/sa-dem.json");
const dem = decodeValues("public/data/sa-dem.png", { ...demMeta, nodata: undefined });
// The hillshade sidecar is the baked DEM's own provenance record.
const demSidecar = readJson("public/data/layers/hillshade.json");

// One classification per grid, reused across every layer on it.
const owner = classifyGrid(districts, grid);
const demOwner = classifyGrid(districts, demMeta);

// Per-district accumulators.
const acc = districts.map(() => ({
  rain: [],
  landcover: new Map(),
  phSum: 0,
  phCells: 0,
  claySum: 0,
  clayCells: 0,
  demSum: 0,
  demCells: 0,
  demMin: Infinity,
  demMax: -Infinity,
}));

for (let i = 0; i < owner.length; i++) {
  const d = owner[i];
  if (d < 0) continue;
  const a = acc[d];
  const rain = values.rain[i];
  if (Number.isFinite(rain)) a.rain.push(rain);
  const cover = values.landcover[i];
  if (Number.isFinite(cover)) {
    const code = String(Math.round(cover));
    if (!(code in metas.landcover.legend)) throw new Error(`land cover class ${code} is not in the legend`);
    a.landcover.set(code, (a.landcover.get(code) ?? 0) + 1);
  }
  const ph = values["soil-ph"][i];
  if (Number.isFinite(ph)) {
    a.phSum += ph;
    a.phCells += 1;
  }
  const clay = values["soil-clay"][i];
  if (Number.isFinite(clay)) {
    a.claySum += clay;
    a.clayCells += 1;
  }
}

for (let i = 0; i < demOwner.length; i++) {
  const d = demOwner[i];
  if (d < 0) continue;
  const v = dem[i];
  if (!Number.isFinite(v)) continue;
  const a = acc[d];
  a.demSum += v;
  a.demCells += 1;
  if (v < a.demMin) a.demMin = v;
  if (v > a.demMax) a.demMax = v;
}

// Notices: bundled from the canonical content module so the count and the app
// can never drift apart.
const scratch = mkdtempSync(join(tmpdir(), "district-stats-"));
let notices;
let noticeIndex;
let noticeChecked;
try {
  const outfile = join(scratch, "farm-notices.mjs");
  await build({
    entryPoints: ["src/content/farm-notices.ts"],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "warning",
  });
  ({ FARM_NOTICES: notices, NOTICE_INDEX: noticeIndex, NOTICE_CHECKED: noticeChecked } = await import(outfile));
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

const coverage = readJson("src/content/notice-coverage.json");
if (noticeIndex !== coverage.source || noticeChecked !== coverage.checked) {
  throw new Error("farm-notices.ts and notice-coverage.json disagree on the index or its review date");
}
const AWAITING_DISTRICT = "District awaiting confirmation";

/** The one district a notice label names, by slug prefix; throws on 0 or 2+. */
function districtForLabel(label) {
  const s = slug(label);
  const matches = districts.filter((d) => d.id === s || d.id.startsWith(`${s}-`));
  if (matches.length !== 1) {
    throw new Error(`notice district "${label}" matches ${matches.length} districts`);
  }
  return matches[0].id;
}

const noticeCounts = new Map(districts.map((d) => [d.id, 0]));
let unassigned = 0;
for (const notice of notices) {
  const ids = notice.districtIds ?? (notice.district === AWAITING_DISTRICT ? [] : [districtForLabel(notice.district)]);
  if (ids.length === 0) unassigned += 1;
  for (const id of ids) {
    if (!byId.has(id)) throw new Error(`notice ${notice.id} names unknown district ${id}`);
    noticeCounts.set(id, noticeCounts.get(id) + 1);
  }
}

// Parcels: the exactly matched cadastral parcels, grouped by their reference
// point. Grouping only — the evidence file is explicit that a point is not a
// verified lease location.
const evidence = readJson("src/data/nc-district-evidence.json");
const parcels = readJson("src/data/notice-parcels.json");
const parcelCounts = new Map(districts.map((d) => [d.id, 0]));
for (const parcel of parcels.features) {
  const [lon, lat] = parcel.properties.coordinates;
  const hit = districts.find((d) => ringsContain(d.rings, lon, lat));
  if (!hit) throw new Error(`parcel ${parcel.properties.noticeId} at ${lon},${lat} is in no district`);
  parcelCounts.set(hit.id, parcelCounts.get(hit.id) + 1);
}

// Assemble, in a fixed key order.
const records = {};
for (let d = 0; d < districts.length; d++) {
  const district = districts[d];
  const a = acc[d];
  if (a.demCells === 0) throw new Error(`${district.id} caught no DEM cell`);

  a.rain.sort((x, y) => x - y);
  const rainCells = a.rain.length;
  const rainBlock =
    rainCells === 0
      ? { mean: null, p10: null, p90: null, cells: 0 }
      : {
          mean: round(a.rain.reduce((sum, v) => sum + v, 0) / rainCells, 0),
          p10: round(quantileSorted(a.rain, 0.1), 0),
          p90: round(quantileSorted(a.rain, 0.9), 0),
          cells: rainCells,
        };

  let coverCells = 0;
  for (const count of a.landcover.values()) coverCells += count;
  const shares = {};
  if (coverCells > 0) {
    const codes = [...a.landcover.keys()].sort((x, y) => Number(x) - Number(y));
    for (const code of codes) shares[code] = round(a.landcover.get(code) / coverCells, 4);
  }

  a.demSum /= a.demCells;

  records[district.id] = {
    name: district.name,
    province: district.province,
    areaKm2: {
      value: round(district.areaKm2, 0),
      unit: "km²",
      source: BOUNDARY_SOURCE,
      date: "2015 dataset",
      method: `Spherical excess area (d3-geo geoArea) × (${EARTH_RADIUS_KM} km)², on the simplified boundaries of src/data/sa-districts.topo.json`,
    },
    rain: {
      ...rainBlock,
      unit: metas.rain.units,
      ...rasterSource(metas.rain),
      method: `${SAMPLING}; mean and 10th / 90th percentiles (linear interpolation) across the district's valid cells; ocean cells are nodata in this layer`,
    },
    landCover: {
      shares: coverCells === 0 ? null : shares,
      cells: coverCells,
      unit: "share of classified cells",
      ...rasterSource(metas.landcover),
      method: `${SAMPLING}; share per class over the classes present, so the shares of one district sum to 1; class labels are in the legend of public/data/layers/landcover.json`,
    },
    soilPh: {
      mean: a.phCells === 0 ? null : round(a.phSum / a.phCells, 2),
      cells: a.phCells,
      unit: metas["soil-ph"].units,
      ...rasterSource(metas["soil-ph"]),
      method: `${SAMPLING}; the source has genuine gaps (parts of Johannesburg), which count as nodata, not as neutral pH`,
    },
    soilClay: {
      meanPercent: a.clayCells === 0 ? null : round(a.claySum / a.clayCells / 10, 2),
      meanGPerKg: a.clayCells === 0 ? null : round(a.claySum / a.clayCells, 1),
      cells: a.clayCells,
      unit: metas["soil-clay"].units,
      ...rasterSource(metas["soil-clay"]),
      method: `${SAMPLING}; percent is the layer's g/kg ÷ 10, the conversion its own units state`,
    },
    elevation: {
      mean: round(a.demSum, 0),
      min: a.demMin,
      max: a.demMax,
      cells: a.demCells,
      unit: "m",
      source: demSidecar.source,
      licence: demSidecar.licence,
      date: demSidecar.date,
      resolution: demSidecar.resolution.replace(/, shaded$/, ""),
      method: `${SAMPLING}, on the ${demMeta.width}×${demMeta.height} DEM grid; mean/min/max in metres above sea level; the baked DEM stores ocean as 0 m, so a coastal district's minimum can be 0`,
    },
    notices: {
      count: noticeCounts.get(district.id),
      unit: "notices",
      source: noticeIndex,
      date: noticeChecked,
      method: `Notices in src/content/farm-notices.ts counted by their district label; a notice spanning two districts counts once in each; ${unassigned} notice(s) read "${AWAITING_DISTRICT}" and count nowhere`,
    },
    parcels: {
      count: parcelCounts.get(district.id),
      unit: "parcels",
      source: evidence.source,
      date: evidence.checked,
      method: `Reference points of the exactly matched parcels in src/data/notice-parcels.json tested against district boundaries. ${evidence.method}`,
    },
  };
}

const output = {
  about: "Per-district facts computed from the baked rasters, the baked DEM, the district boundaries and the 2026 DLRRD notice review. Grid statistics count cells whose centre falls inside the district; nodata cells are excluded and null means the layer recorded nothing there. Notice and parcel counts describe what that review found, not every advert or parcel of state land.",
  boundaries: {
    source: BOUNDARY_SOURCE,
    date: "2015 dataset",
    method: "Downloaded and cached by scripts/build-topo.mjs, simplified to a 5% retained-point share and quantised into src/data/sa-districts.topo.json; 2015 names updated to current official municipal names there",
  },
  coverage: {
    source: coverage.source,
    checked: coverage.checked,
    scope: coverage.scope,
  },
  districts: records,
};

writeFileSync(OUT_FILE, JSON.stringify(output, null, 2) + "\n");
const kb = (readFileSync(OUT_FILE).length / 1024).toFixed(0);
console.log(`district-stats: notices ${notices.length} (${unassigned} awaiting a district), parcels ${parcels.features.length}`);
console.log(`district-stats: wrote ${OUT_FILE} · ${kb} KB`);
