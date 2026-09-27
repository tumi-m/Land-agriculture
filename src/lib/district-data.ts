/**
 * What the model's layer slices say about one district, read from the
 * statistics baked from the rasters (src/data/district-stats.json).
 *
 * Pure: no rendering, no clock. Every figure keeps the source, licence and
 * date it arrived with, because a number on the card without them would be
 * a claim nobody could check.
 */
import STATS from "@/data/district-stats.json";
import LANDCOVER from "../../public/data/layers/landcover.json";
import { OTHER_CLASS, WORLDCOVER, type Ramp } from "@/design/ramps";

export interface Sourced {
  source: string;
  licence?: string;
  date?: string;
  resolution?: string;
}

export interface CoverShare {
  code: string;
  name: string;
  share: number;
  colour: string;
}

export interface Rank {
  /** 1 is the highest value among the districts that have one. */
  position: number;
  of: number;
  /** How many districts sit below this one. */
  above: number;
}

type Raw = (typeof STATS.districts)[keyof typeof STATS.districts];
const DISTRICTS = STATS.districts as Record<string, Raw>;
const LEGEND = LANDCOVER.legend as Record<string, string>;

/**
 * Classes below this share are folded into "Other". Below about 2% a slice of
 * a bar is a sliver nobody can read or tap, and five classes plus "Other"
 * says as much as eleven.
 */
export const MIN_SHARE = 0.02;

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function districtStats(id: string): Raw | null {
  return DISTRICTS[id] ?? null;
}

/** Land cover shares, largest first, small classes folded into "Other". */
export function landCover(id: string): CoverShare[] {
  const shares = districtStats(id)?.landCover?.shares as
    | Record<string, number>
    | undefined;
  if (!shares) return [];
  const rows: CoverShare[] = [];
  let other = 0;
  for (const [code, raw] of Object.entries(shares)) {
    const share = finite(raw);
    if (share === null || share <= 0) continue;
    if (share < MIN_SHARE) {
      other += share;
      continue;
    }
    rows.push({
      code,
      name: LEGEND[code] ?? `Class ${code}`,
      share,
      colour: WORLDCOVER[code] ?? OTHER_CLASS,
    });
  }
  rows.sort((a, b) => b.share - a.share || a.code.localeCompare(b.code));
  if (other > 0) {
    rows.push({ code: "other", name: "Other classes", share: other, colour: OTHER_CLASS });
  }
  return rows;
}

/**
 * Where a district sits among all districts that report the same measure.
 * Ties share a position, so two equally wet districts never read as one
 * wetter than the other.
 */
export function rankBy(
  id: string,
  read: (d: Raw) => number | null,
): Rank | null {
  const own = districtStats(id);
  const mine = own ? read(own) : null;
  if (mine === null) return null;
  const values = Object.values(DISTRICTS)
    .map(read)
    .filter((v): v is number => v !== null);
  const greater = values.filter((v) => v > mine).length;
  const below = values.filter((v) => v < mine).length;
  return { position: greater + 1, of: values.length, above: below };
}

export const readRain = (d: Raw) => finite(d.rain?.mean);
export const readPh = (d: Raw) => finite(d.soilPh?.mean);
export const readClay = (d: Raw) => finite(d.soilClay?.meanPercent);
export const readElevation = (d: Raw) => finite(d.elevation?.mean);

/** The lowest and highest value any district reports, for drawing a scale. */
export function spread(read: (d: Raw) => number | null): [number, number] | null {
  const values = Object.values(DISTRICTS)
    .map(read)
    .filter((v): v is number => v !== null);
  if (!values.length) return null;
  return [Math.min(...values), Math.max(...values)];
}

/**
 * Plain words for a soil pH. The bands are the conventional agronomic ones;
 * they describe the number, they do not say what will grow — that needs a
 * soil test on the parcel itself.
 */
export function phBand(ph: number): string {
  if (ph < 5.5) return "strongly acidic";
  if (ph < 6.5) return "moderately acidic";
  if (ph <= 7.5) return "near neutral";
  if (ph <= 8.5) return "moderately alkaline";
  return "strongly alkaline";
}

/** "Wetter than 38 of the other 51 districts" — or null when it cannot be said. */
export function comparedWith(rank: Rank | null, more: string): string | null {
  if (!rank || rank.of < 2) return null;
  const others = rank.of - 1;
  return `${more} than ${rank.above} of the other ${others} districts`;
}

/**
 * A CSS gradient that paints `ramp` across the domain lo..hi, so a scale bar
 * shows the same colours the raster uses for the same values. Stops outside
 * the domain are clamped to its ends rather than dropped, which keeps the
 * colour at each end true to the ramp.
 */
export function rampGradient(ramp: Ramp, lo: number, hi: number): string {
  const span = hi - lo || 1;
  const at = (v: number) => Math.max(0, Math.min(100, ((v - lo) / span) * 100));
  const stops = ramp.map(([v, colour]) => `${colour} ${at(v).toFixed(1)}%`);
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/** Where `value` sits along lo..hi, as a 0–1 fraction, clamped. */
export function along(value: number, lo: number, hi: number): number {
  const span = hi - lo || 1;
  return Math.max(0, Math.min(1, (value - lo) / span));
}
