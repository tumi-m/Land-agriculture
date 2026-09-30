/**
 * The baked rasters draped on the model's slices: land cover on the land
 * slice, soil pH on the soil slice, rainfall on the water slice.
 *
 * The rasters are plain longitude/latitude grids; the model is drawn in
 * Mercator. Mercator is separable — x follows longitude linearly, y follows
 * latitude but not linearly — and a slice's top face is a few large
 * triangles with no vertices inside, across which texture coordinates are
 * interpolated linearly. Texture coordinates taken straight from latitude
 * would drift by tens of kilometres across South Africa's 13° of latitude.
 * So each raster's rows are resampled once into Mercator spacing, after
 * which a coordinate that is linear in scene space is exact.
 *
 * The geometry here is pure and tested (tests/uv.test.ts); loading and
 * resampling the images needs a browser.
 */
import * as THREE from "three";
import { MAP_HEIGHT, MAP_WIDTH, projection } from "@/lib/geo";
import type { LandLayer } from "@/lib/exploded-map";

export interface RasterGrid {
  west: number;
  east: number;
  south: number;
  north: number;
}

/** Every baked layer shares this grid (public/data/layers/*.json). */
export const LAYER_GRID: RasterGrid = {
  west: 16.35,
  east: 33.05,
  south: -35,
  north: -22,
};

export interface SceneBounds {
  xWest: number;
  xEast: number;
  zNorth: number;
  zSouth: number;
}

/** Projected pixels to scene units: the inverse of worldToLonLat. */
function toScene([x, y]: [number, number]): [number, number] {
  return [(x - MAP_WIDTH / 2) / 10, (y - MAP_HEIGHT / 2) / 10];
}

/** The scene rectangle a raster grid covers; north is the smaller z. */
export function sceneBounds(grid: RasterGrid = LAYER_GRID): SceneBounds {
  const [xWest, zNorth] = toScene(
    projection([grid.west, grid.north]) as [number, number],
  );
  const [xEast, zSouth] = toScene(
    projection([grid.east, grid.south]) as [number, number],
  );
  return { xWest, xEast, zNorth, zSouth };
}

/**
 * Texture coordinates for a scene point, for a texture whose rows have been
 * resampled into Mercator spacing. u runs west to east; v runs south to
 * north, as three.js reads a texture with its first row at the top.
 */
export function sceneUv(
  x: number,
  z: number,
  bounds: SceneBounds,
): [number, number] {
  return [
    (x - bounds.xWest) / (bounds.xEast - bounds.xWest),
    1 - (z - bounds.zNorth) / (bounds.zSouth - bounds.zNorth),
  ];
}

/**
 * Which row of the source grid (rows north to south, `sourceRows` of them)
 * belongs at output row `row` of `rows` rows spaced evenly in Mercator.
 * Fractional; the caller rounds to the nearest row.
 */
export function sourceRow(
  row: number,
  rows: number,
  sourceRows: number,
  grid: RasterGrid = LAYER_GRID,
  bounds: SceneBounds = sceneBounds(grid),
): number {
  const z = bounds.zNorth + ((row + 0.5) / rows) * (bounds.zSouth - bounds.zNorth);
  const lonLat = projection.invert?.([
    grid.west, // any x: Mercator's y does not depend on it
    z * 10 + MAP_HEIGHT / 2,
  ]);
  const lat = lonLat ? lonLat[1] : grid.north;
  return ((grid.north - lat) / (grid.north - grid.south)) * sourceRows - 0.5;
}

/**
 * Writes planar texture coordinates for a geometry whose positions are in
 * scene space offset by `origin` (a piece is built around its own centre).
 * The walls take the colour of the cell at their foot, like a cut through
 * the layer.
 */
export function setPlanarUv(
  geometry: THREE.BufferGeometry,
  origin: { x: number; z: number },
  bounds: SceneBounds = sceneBounds(),
): void {
  const position = geometry.getAttribute("position");
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    const [u, v] = sceneUv(
      position.getX(i) + origin.x,
      position.getZ(i) + origin.z,
      bounds,
    );
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

/** Which baked raster each slice shows. Government land has none. */
export const SLICE_RASTER: Partial<Record<LandLayer, { file: string; categorical: boolean }>> = {
  land: { file: "landcover", categorical: true },
  soil: { file: "soil-ph", categorical: false },
  climate: { file: "rain", categorical: false },
};

const cache = new Map<string, Promise<THREE.Texture | null>>();

/**
 * Loads a layer's colour raster and resamples its rows into Mercator
 * spacing. Categorical layers keep hard edges: a blend of two land-cover
 * classes is a colour that means nothing. Resolves null when the image does
 * not load, so a slice simply keeps its flat colour.
 */
export function loadSliceTexture(layer: LandLayer): Promise<THREE.Texture | null> {
  const raster = SLICE_RASTER[layer];
  if (!raster) return Promise.resolve(null);
  const cached = cache.get(raster.file);
  if (cached) return cached;
  const promise = new Promise<THREE.Texture | null>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onerror = () => resolve(null);
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.imageSmoothingEnabled = false;
      const rows = canvas.height;
      const bounds = sceneBounds();
      for (let row = 0; row < rows; row++) {
        const from = Math.min(
          image.naturalHeight - 1,
          Math.max(0, Math.round(sourceRow(row, rows, image.naturalHeight, LAYER_GRID, bounds))),
        );
        ctx.drawImage(image, 0, from, canvas.width, 1, 0, row, canvas.width, 1);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      if (raster.categorical) {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
      }
      resolve(texture);
    };
    image.src = `/data/layers/${raster.file}.color.png`;
  });
  cache.set(raster.file, promise);
  return promise;
}
