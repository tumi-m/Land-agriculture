/**
 * The URL grammar. Every selection, view and measure is one `at=` value plus
 * small switches, written with history.replaceState and debounced by the
 * caller.
 *
 *   ?at=province:LP
 *   ?at=district:LP:vhembe-district
 *   ?at=layer:LP:vhembe-district:soil
 *   ?at=notice:<id>
 *   ?at=point:30.35210,-23.83910
 *   ?view=atlas   ?metric=released   (old ?province=LP links keep working)
 */
import {
  parentOf,
  selectionOf,
  type ExplorerState,
  type LandLayerId,
  type Selection,
  type ViewName,
} from "./explorer";
import type { Metric } from "@/lib/land-metrics";
import { PROVINCE_ORDER } from "@/content/provinces";
import { DISTRICTS_BY_PROVINCE } from "@/lib/geo";
import type { ProvinceCode } from "@/lib/types";

export type { Selection, ViewName, LandLayerId };

const LAYER_IDS: LandLayerId[] = ["land", "soil", "climate", "opportunity"];
const VIEWS: ViewName[] = ["anatomy", "atlas", "data"];
const METRIC_IDS: Metric[] = ["advertised", "released", "share"];

export interface UrlState {
  at: Selection;
  view: ViewName;
  metric: Metric;
}

function samePoint(a: Selection, b: Selection): boolean {
  return (
    a.kind === "point" &&
    b.kind === "point" &&
    a.lng === b.lng &&
    a.lat === b.lat
  );
}

export function sameSelection(a: Selection, b: Selection): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "point" && b.kind === "point") return samePoint(a, b);
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Turns one selection into its at= value; null kinds are left out. */
export function encodeAt(selection: Selection): string | null {
  switch (selection.kind) {
    case "country":
      return null;
    case "province":
      return `province:${selection.province}`;
    case "district":
      return `district:${selection.province}:${selection.district}`;
    case "layer":
      return `layer:${selection.province}:${selection.district}:${selection.layer}`;
    case "notice":
      return `notice:${selection.id}`;
    case "point":
      return `point:${selection.lng.toFixed(5)},${selection.lat.toFixed(5)}`;
  }
}

function isDistrictOf(
  province: ProvinceCode,
  district: string,
): boolean {
  return (DISTRICTS_BY_PROVINCE[province] ?? []).some(
    (entry) => entry.id === district,
  );
}

/** Parses an at= value. Anything unknown or out of bounds is a rejection. */
export function decodeAt(value: string | null): Selection | null {
  if (!value) return null;
  const [head, a, b, c] = value.split(":");
  switch (head) {
    case "province":
      return isProvince(a) ? { kind: "province", province: a } : null;
    case "district":
      return isProvince(a) && b && isDistrictOf(a, b)
        ? { kind: "district", province: a, district: b }
        : null;
    case "layer":
      return isProvince(a) &&
        b &&
        isDistrictOf(a, b) &&
        LAYER_IDS.includes(c as LandLayerId)
        ? { kind: "layer", province: a, district: b, layer: c as LandLayerId }
        : null;
    case "notice":
      return a ? { kind: "notice", id: a } : null;
    case "point": {
      const [lng, lat] = (a ?? "").split(",").map(Number);
      return inSouthAfrica(lng, lat)
        ? { kind: "point", lng, lat }
        : null;
    }
    default:
      return null;
  }
}

function isProvince(value: string | undefined): value is ProvinceCode {
  return !!value && (PROVINCE_ORDER as string[]).includes(value);
}

function inSouthAfrica(lng: number, lat: number): boolean {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= 16 &&
    lng <= 33.1 &&
    lat >= -35.5 &&
    lat <= -21.9
  );
}

export function decodeView(value: string | null): ViewName {
  return VIEWS.includes(value as ViewName) ? (value as ViewName) : "anatomy";
}

export function decodeMetric(value: string | null): Metric {
  return METRIC_IDS.includes(value as Metric) ? (value as Metric) : "advertised";
}

/** The store fields a URL round-trips: selection, view and metric. */
export type UrlFields = Pick<ExplorerState, "view" | "metric"> & {
  at: Selection;
};

/** Reads the explorer state carried in a location search string. */
export function readUrlState(search: string): UrlFields {
  const params = new URLSearchParams(search);
  return {
    // Old ?province= links keep working: an invalid or missing at= falls
    // back to the bare province param, then to the country.
    at:
      decodeAt(params.get("at")) ??
      decodeAt(
        params.get("province")
          ? `province:${params.get("province")}`
          : null,
      ) ??
      { kind: "country" },
    view: decodeView(params.get("view")),
    metric: decodeMetric(params.get("metric")),
  };
}

/**
 * Writes the explorer state into a search string. The country selection
 * clears at=; everything else replaces it. Old province links keep working
 * by also accepting them on read.
 */
export function writeUrlState(state: UrlFields): string {
  const params = new URLSearchParams();
  const at = encodeAt(state.at);
  if (at) params.set("at", at);
  if (state.view !== "anatomy") params.set("view", state.view);
  if (state.metric !== "advertised") params.set("metric", state.metric);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export { parentOf, selectionOf };