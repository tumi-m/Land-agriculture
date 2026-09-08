import { PROVINCE_SHAPES } from "./geo";
import type { ProvinceCode } from "./types";

export type MapBounds = [[number, number], [number, number]];
export function provinceBounds(code: ProvinceCode | null): MapBounds {
  const shapes = PROVINCE_SHAPES.filter(
    (shape) => !code || shape.code === code,
  );
  const points = shapes.flatMap((shape) => shape.geometry.coordinates.flat(2));
  return [
    [
      Math.min(...points.map((p) => p[0])),
      Math.min(...points.map((p) => p[1])),
    ],
    [
      Math.max(...points.map((p) => p[0])),
      Math.max(...points.map((p) => p[1])),
    ],
  ];
}

/** Reserve room only for overlays that are actually present at this breakpoint. */
export function atlasPadding(
  width: number,
  guided: boolean,
  selected: boolean,
) {
  return {
    top: guided ? (width <= 640 ? 200 : 135) : 80,
    bottom: 75,
    left: guided && width > 1100 ? 130 : 40,
    right: !guided && selected && width > 1100 ? 390 : 55,
  };
}

export const ATLAS_ATTRIBUTION =
  'Rivers: <a href="https://www.naturalearthdata.com/about/terms-of-use/">Natural Earth</a>. Imagery © <a href="https://maps.eox.at/">EOX Maps</a> / Copernicus Sentinel (2016–17). Terrain © EOX / <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> and <a href="https://maps.eox.at/#data">other sources</a>.';
export const TILE_BASE = "https://tiles.maps.eox.at/wmts/1.0.0/";
