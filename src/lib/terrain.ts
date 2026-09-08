import type { ProvinceCode } from "./types";

/** Regional camera positions; these are views of the landscape, never farm listings. */
export const PROVINCE_VIEWS: Record<
  ProvinceCode,
  { center: [number, number]; zoom: number }
> = {
  LP: { center: [30.05, -23.82], zoom: 9.1 },
  NW: { center: [26.1, -26.4], zoom: 8.2 },
  MP: { center: [30.55, -25.3], zoom: 9 },
  KZN: { center: [30.1, -29.5], zoom: 8.8 },
  FS: { center: [27.3, -28.1], zoom: 8.2 },
  EC: { center: [26.6, -32.2], zoom: 8.4 },
  WC: { center: [19.3, -33.8], zoom: 9 },
  NC: { center: [21.4, -29.4], zoom: 8 },
  GP: { center: [28.5, -25.7], zoom: 8.8 },
};
export const TERRAIN_EXAGGERATION = 1.6;
export const ELEVATION_TILES =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
export const ELEVATION_ATTRIBUTION =
  '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Elevation: Mapzen / USGS / SRTM</a>';

/** The renderer scales relief; readouts must report the original elevation. */
export function groundElevation(rendered: number | null): number | null {
  return rendered === null || !Number.isFinite(rendered)
    ? null
    : Math.round(rendered / TERRAIN_EXAGGERATION);
}
