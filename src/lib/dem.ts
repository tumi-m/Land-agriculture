import * as THREE from "three";
import { MAP_HEIGHT, MAP_WIDTH, projection } from "./geo";

/**
 * Real elevation for the 3D map.
 *
 * public/data/sa-dem.png is a 720×560 grid over South Africa built at release
 * time from Mapzen/Terrarium tiles (scripts/build-dem.mjs) — the same source the
 * atlas uses for its DEM. Two bytes a sample, quantised to 4 m, ~339 KB.
 *
 * It is fetched once, lazily, the first time a map asks for relief, and decoded
 * to a Float32Array. Nothing blocks on it: callers draw flat and apply relief
 * when it resolves, so a slow connection costs detail rather than a wait.
 */
export interface Dem {
  west: number;
  south: number;
  east: number;
  north: number;
  width: number;
  height: number;
  offset: number;
  step: number;
  metres: Float32Array;
}

export const DEM_ATTRIBUTION =
  "Elevation: Mapzen / USGS / SRTM via AWS Terrain Tiles";

/** Metres of elevation per world unit, so relief reads without dwarfing the map. */
export const RELIEF_EXAGGERATION = 12;

let pending: Promise<Dem | null> | null = null;

async function decode(): Promise<Dem | null> {
  try {
    const signal = AbortSignal.timeout(10000);
    const [metaRes, imageRes] = await Promise.all([
      fetch("/data/sa-dem.json", { signal }),
      fetch("/data/sa-dem.png", { signal }),
    ]);
    if (!metaRes.ok || !imageRes.ok) return null;

    const meta = (await metaRes.json()) as Omit<Dem, "metres">;
    // colorSpaceConversion stays off: these bytes are elevation, not colour, and
    // the browser will otherwise happily "correct" them.
    const bitmap = await createImageBitmap(await imageRes.blob(), {
      colorSpaceConversion: "none",
    });
    // Read the dimensions before closing the bitmap — afterwards they read 0.
    const width = bitmap.width;
    const height = bitmap.height;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, 0, width, height);
    bitmap.close?.();

    const metres = new Float32Array(width * height);
    for (let i = 0; i < metres.length; i++) {
      metres[i] =
        ((data[i * 4] << 8) | data[i * 4 + 1]) * meta.step - meta.offset;
    }

    return { ...meta, width, height, metres };
  } catch {
    return null;
  }
}

export function loadDem(): Promise<Dem | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  pending ??= decode();
  return pending;
}

/** Bilinear elevation in metres, or 0 outside the grid. */
export function elevationAt(dem: Dem, lon: number, lat: number): number {
  const fx = ((lon - dem.west) / (dem.east - dem.west)) * dem.width - 0.5;
  const fy = ((dem.north - lat) / (dem.north - dem.south)) * dem.height - 0.5;
  if (fx < 0 || fy < 0 || fx > dem.width - 1 || fy > dem.height - 1) return 0;

  const x = Math.min(dem.width - 2, Math.floor(fx));
  const y = Math.min(dem.height - 2, Math.floor(fy));
  const dx = fx - x;
  const dy = fy - y;
  const m = dem.metres;
  const w = dem.width;

  return (
    m[y * w + x] * (1 - dx) * (1 - dy) +
    m[y * w + x + 1] * dx * (1 - dy) +
    m[(y + 1) * w + x] * (1 - dx) * dy +
    m[(y + 1) * w + x + 1] * dx * dy
  );
}

/** Scene coordinates back to lon/lat — the inverse of geo.projectedRings. */
export function worldToLonLat(x: number, z: number): [number, number] | null {
  const point = projection.invert?.([
    x * 10 + MAP_WIDTH / 2,
    z * 10 + MAP_HEIGHT / 2,
  ]);
  return point ? [point[0], point[1]] : null;
}

/**
 * Lifts a slab's top face onto the real land surface.
 *
 * The extrusion runs from y=0 to y=depth, so only vertices at the top are moved
 * — the base stays flat and the side walls stretch to meet the new surface,
 * which is what makes an escarpment read as a cliff rather than a fold.
 */
export function applyRelief(
  geometry: THREE.BufferGeometry,
  dem: Dem,
  depth: number,
  origin: { x: number; z: number },
  scale = RELIEF_EXAGGERATION,
): void {
  const position = geometry.getAttribute("position");
  const array = position.array as Float32Array;
  // World units per metre: the scene spans ~100 units for ~1600 km.
  const unitsPerMetre = (100 / 1_600_000) * scale;
  for (let i = 0; i < position.count; i++) {
    const o = i * 3;
    // The extrusion only has vertices at its top and bottom rings, so lifting
    // everything above the half-way line takes the cap and its bevel together
    // and simply stretches the wall between them.
    if (array[o + 1] < depth * 0.5) continue;
    const lonLat = worldToLonLat(array[o] + origin.x, array[o + 2] + origin.z);
    if (!lonLat) continue;
    array[o + 1] += elevationAt(dem, lonLat[0], lonLat[1]) * unitsPerMetre;
  }

  // Shade the surface by height as well as shape. Lighting alone barely
  // registers on a slab this wide, and a vertex colour multiplies the layer's
  // own colour, so the palette stays and the ridges become readable.
  const tint = new Float32Array(position.count * 3);
  tint.fill(1);
  for (let i = 0; i < position.count; i++) {
    const o = i * 3;
    if (array[o + 1] < depth * 0.5) continue;
    const lonLat = worldToLonLat(array[o] + origin.x, array[o + 2] + origin.z);
    if (!lonLat) continue;
    const t = Math.max(
      0,
      Math.min(1, elevationAt(dem, lonLat[0], lonLat[1]) / 2200),
    );
    const shade = 0.72 + t * 0.46;
    tint[o] = shade;
    tint[o + 1] = shade;
    tint[o + 2] = shade;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(tint, 3));

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

/** World-space position for a lon/lat, on the land surface. */
export function surfacePoint(
  dem: Dem | null,
  lon: number,
  lat: number,
  baseY: number,
  scale = RELIEF_EXAGGERATION,
): THREE.Vector3 {
  const [px, py] = projection([lon, lat]) ?? [MAP_WIDTH / 2, MAP_HEIGHT / 2];
  const x = (px - MAP_WIDTH / 2) / 10;
  const z = (py - MAP_HEIGHT / 2) / 10;
  const unitsPerMetre = (100 / 1_600_000) * scale;
  const lift = dem ? elevationAt(dem, lon, lat) * unitsPerMetre : 0;
  return new THREE.Vector3(x, baseY + lift, z);
}
