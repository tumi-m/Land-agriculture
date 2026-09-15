/**
 * Decoding for the baked rasters in public/data/layers/.
 *
 * Continuous layers (rain, soil) use the DEM's two-byte encoding:
 *   value = (R × 256 + G) × step − offset, metres or millimetres per cell.
 * Categorical layers (landcover) store a class code the same way.
 *
 * The .json sidecar carries bounds, size, step, offset, nodata, units,
 * legend, source, licence and date, so every number rendered from a layer
 * carries its provenance.
 */
export interface RasterMeta {
  layer: string;
  west: number;
  south: number;
  east: number;
  north: number;
  width: number;
  height: number;
  step: number;
  offset: number;
  nodata: number | null;
  units: string;
  resolution: string;
  source: string;
  licence: string;
  date: string;
  /** Categorical layers carry a legend of class code → label. */
  legend?: Record<string, string>;
}

export interface Raster extends RasterMeta {
  values: Float32Array;
}

export function decodeRasterChannel(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  meta: Pick<RasterMeta, "step" | "offset" | "nodata">,
): Float32Array {
  const values = new Float32Array(width * height);
  for (let i = 0; i < values.length; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    if (meta.nodata !== null && r === meta.nodata && g === meta.nodata) {
      values[i] = NaN;
      continue;
    }
    values[i] = (r * 256 + g) * meta.step - meta.offset;
  }
  return values;
}

/** Nearest-neighbour sample at lon/lat; NaN outside the grid or at nodata. */
export function sampleRaster(raster: Raster, lon: number, lat: number): number {
  const { west, east, south, north, width, height } = raster;
  if (lon < west || lon > east || lat < south || lat > north) return NaN;
  const x = Math.min(
    width - 1,
    Math.max(0, Math.floor(((lon - west) / (east - west)) * width)),
  );
  const y = Math.min(
    height - 1,
    Math.max(0, Math.floor(((north - lat) / (north - south)) * height)),
  );
  return raster.values[y * width + x];
}