/**
 * Builds the elevation raster the 3D map uses for relief.
 *
 *   npm run data:dem [gridWidth]
 *
 * Downloads Mapzen/Terrarium tiles (the same source the atlas already uses for
 * its DEM), decodes them, resamples to a regular lon/lat grid over South Africa
 * and writes a PNG. Two bytes per sample: R is the high byte, G the low byte of
 * (metres + OFFSET), so the full -500..7000 m range survives losslessly and PNG
 * still compresses the smooth parts hard.
 *
 * Run at build time only. The app ships the PNG and never touches the tile
 * server at runtime.
 */
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const Z = 7;
const OFFSET = 0;
/**
 * Vertical quantisation in metres. The source is ~30 m data resampled to
 * kilometres, so 4 m steps are far below its real accuracy — and shrinking the
 * value range shrinks the low byte's entropy, which is what the PNG pays for.
 */
const STEP = 4;
const BBOX = { west: 16.35, south: -35.0, east: 33.05, north: -22.0 };
const OUT_W = Number(process.argv[2] ?? 900);
const CACHE = new URL("./.cache-dem/", import.meta.url);
const SOURCE = (z, x, y) =>
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

const lonToX = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const latToY = (lat, z) => {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z;
};

fs.mkdirSync(CACHE, { recursive: true });

const x0 = Math.floor(lonToX(BBOX.west, Z));
const x1 = Math.floor(lonToX(BBOX.east, Z));
const y0 = Math.floor(latToY(BBOX.north, Z));
const y1 = Math.floor(latToY(BBOX.south, Z));
const cols = x1 - x0 + 1;
const rows = y1 - y0 + 1;
console.log(`z${Z}: x ${x0}..${x1}, y ${y0}..${y1} — ${cols * rows} tiles`);

async function tile(x, y) {
  const file = new URL(`${Z}-${x}-${y}.png`, CACHE);
  if (!fs.existsSync(file)) {
    const res = await fetch(SOURCE(Z, x, y));
    if (!res.ok) throw new Error(`tile ${Z}/${x}/${y} responded ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return PNG.sync.read(fs.readFileSync(file));
}

// Assemble the tiles into one elevation field, in tile-pixel space.
const TILE = 256;
const field = new Float32Array(cols * TILE * rows * TILE);
const fieldW = cols * TILE;

for (let ty = 0; ty < rows; ty++) {
  for (let tx = 0; tx < cols; tx++) {
    const png = await tile(x0 + tx, y0 + ty);
    for (let py = 0; py < TILE; py++) {
      for (let px = 0; px < TILE; px++) {
        const i = (py * TILE + px) * 4;
        const r = png.data[i];
        const g = png.data[i + 1];
        const b = png.data[i + 2];
        field[(ty * TILE + py) * fieldW + tx * TILE + px] =
          r * 256 + g + b / 256 - 32768;
      }
    }
  }
  process.stdout.write(`  row ${ty + 1}/${rows}\r`);
}
console.log(`\nassembled ${fieldW}×${rows * TILE} source samples`);

// Resample onto a regular lon/lat grid, bilinear.
const aspect = (BBOX.north - BBOX.south) / (BBOX.east - BBOX.west);
const OUT_H = Math.round(OUT_W * aspect);
const out = new PNG({ width: OUT_W, height: OUT_H });
let min = Infinity;
let max = -Infinity;

for (let oy = 0; oy < OUT_H; oy++) {
  const lat = BBOX.north - ((oy + 0.5) / OUT_H) * (BBOX.north - BBOX.south);
  const fy = (latToY(lat, Z) - y0) * TILE;
  for (let ox = 0; ox < OUT_W; ox++) {
    const lon = BBOX.west + ((ox + 0.5) / OUT_W) * (BBOX.east - BBOX.west);
    const fx = (lonToX(lon, Z) - x0) * TILE;

    const x = Math.max(0, Math.min(fieldW - 2, Math.floor(fx)));
    const y = Math.max(0, Math.min(rows * TILE - 2, Math.floor(fy)));
    const dx = fx - x;
    const dy = fy - y;
    const h =
      field[y * fieldW + x] * (1 - dx) * (1 - dy) +
      field[y * fieldW + x + 1] * dx * (1 - dy) +
      field[(y + 1) * fieldW + x] * (1 - dx) * dy +
      field[(y + 1) * fieldW + x + 1] * dx * dy;

    // Terrarium carries ocean bathymetry. None of it is farmland, and the noise
    // costs more in PNG entropy than the whole of Limpopo — clamp it flat.
    const land = Math.max(0, h);
    min = Math.min(min, land);
    max = Math.max(max, land);

    const stored = Math.max(0, Math.min(65535, Math.round((land + OFFSET) / STEP)));
    const i = (oy * OUT_W + ox) * 4;
    out.data[i] = stored >> 8;
    out.data[i + 1] = stored & 255;
    out.data[i + 2] = 0;
    out.data[i + 3] = 255;
  }
}

const dir = new URL("../public/data/", import.meta.url);
fs.mkdirSync(dir, { recursive: true });
const pngPath = path.join(dir.pathname, "sa-dem.png");
fs.writeFileSync(pngPath, PNG.sync.write(out, { colorType: 6, deflateLevel: 9 }));

const meta = { ...BBOX, width: OUT_W, height: OUT_H, offset: OFFSET, step: STEP, zoom: Z };
fs.writeFileSync(path.join(dir.pathname, "sa-dem.json"), JSON.stringify(meta) + "\n");

const kb = (fs.statSync(pngPath).size / 1024).toFixed(0);
console.log(
  `grid ${OUT_W}×${OUT_H} · elevation ${Math.round(min)}..${Math.round(max)} m · ${kb} KB`,
);
