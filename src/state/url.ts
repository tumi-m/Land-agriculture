/**
 * The URL grammar. Every selection, view and measure is one `at=` value plus
 * small switches, written with history.replaceState and debounced by the
 * caller.
 *
 *   ?at=province:LP
 *   ?at=district:LP:vhembe-district
 *   ?at=layer:LP:vhembe-district:soil
 *   ?at=notice:<id>
 *   ?at=parcel:<21-char SG code>
 *   ?at=point:30.35210,-23.83910
 *   ?at=photo:<uuid>
 *   ?view=land   ?depth=0.72   ?layers=landcover,rain   ?cam=lng,lat,zoom,brg,pitch
 *   ?metric=released   (accepted on read, maps onto ?view=land; see below)
 *
 * Old links keep working: `?province=LP` becomes a province selection, and
 * the retired view names map onto the two that remain — anatomy→model,
 * atlas→land, data→land.
 */
import {
  parentOf,
  selectionOf,
  type CameraPose,
  type ExplorerState,
  type LandLayerId,
  type Selection,
  type ViewName,
} from "./explorer";
import type { Metric } from "@/lib/land-metrics";
import { PROVINCE_ORDER } from "@/content/provinces";
import { DISTRICTS_BY_PROVINCE } from "@/lib/geo";
import type { ProvinceCode } from "@/lib/types";

export type { Selection, ViewName, LandLayerId, CameraPose };

const LAYER_IDS: LandLayerId[] = ["land", "soil", "climate", "opportunity"];
const METRIC_IDS: Metric[] = ["advertised", "released", "share"];

/** A 21-character Surveyor-General code: letters and digits only. */
const SG_CODE = /^[A-Z0-9]{21}$/;

export interface UrlState {
  at: Selection;
  view: ViewName;
  metric: Metric;
  depth: number | null;
  layers: string[];
  camera: CameraPose | null;
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
    case "parcel":
      return `parcel:${selection.sgCode}`;
    case "point":
      return `point:${selection.lng.toFixed(5)},${selection.lat.toFixed(5)}`;
    case "photo":
      return `photo:${selection.id}`;
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
    case "parcel":
      return a && SG_CODE.test(a) ? { kind: "parcel", sgCode: a } : null;
    case "point": {
      const [lng, lat] = (a ?? "").split(",").map(Number);
      return inSouthAfrica(lng, lat)
        ? { kind: "point", lng, lat }
        : null;
    }
    case "photo":
      return a ? { kind: "photo", id: a } : null;
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

/**
 * The retired view names map onto the two that remain. A comparison view was
 * planned (`data`); it resolves to the land, where its figures now live.
 */
export function decodeView(value: string | null): ViewName {
  switch (value) {
    case "model":
    case "anatomy":
      return "model";
    case "land":
    case "atlas":
    case "data":
      return "land";
    default:
      return "model";
  }
}

export function decodeMetric(value: string | null): Metric {
  return METRIC_IDS.includes(value as Metric) ? (value as Metric) : "advertised";
}

/** Parses the depth switch: 0–1, anything else becomes null (leave it). */
export function decodeDepth(value: string | null): number | null {
  if (value === null) return null;
  const depth = Number(value);
  return Number.isFinite(depth) && depth >= 0 && depth <= 1 ? depth : null;
}

/** The depth switch is only written when it is not the assembled rest. */
export function encodeDepth(depth: number): string | null {
  return depth > 0 ? String(Math.round(depth * 100) / 100) : null;
}

/** Parses the layers switch into a clean, de-duplicated list of def ids. */
export function decodeLayers(value: string | null): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  for (const raw of value.split(",")) {
    const id = raw.trim();
    if (id) seen.add(id);
  }
  return [...seen];
}

export function encodeLayers(layers: string[]): string | null {
  return layers.length ? layers.join(",") : null;
}

/**
 * The land camera pose. Written only for view="land"; the model's camera is
 * a view concern, not shareable state. All five parts must be finite and in
 * range or the whole pose is rejected — a partial pose is no pose.
 */
export function decodeCamera(value: string | null): CameraPose | null {
  if (!value) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 5) return null;
  const [lng, lat, zoom, bearing, pitch] = parts;
  if (!inSouthAfrica(lng, lat)) return null;
  if (!Number.isFinite(zoom) || zoom < 0 || zoom > 24) return null;
  if (!Number.isFinite(bearing) || !Number.isFinite(pitch)) return null;
  return { lng, lat, zoom, bearing, pitch };
}

export function encodeCamera(camera: CameraPose | null): string | null {
  if (!camera) return null;
  const { lng, lat, zoom, bearing, pitch } = camera;
  return `${lng.toFixed(5)},${lat.toFixed(5)},${round(zoom)},${round(bearing)},${round(pitch)}`;
}

function round(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** The store fields a URL round-trips. */
export type UrlFields = Pick<ExplorerState, "view" | "metric"> & {
  at: Selection;
  depth?: number | null;
  layers?: string[];
  camera?: CameraPose | null;
};

/** Reads the explorer state carried in a location search string. */
export function readUrlState(search: string): UrlState {
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
    depth: decodeDepth(params.get("depth")),
    layers: decodeLayers(params.get("layers")),
    camera: decodeCamera(params.get("cam")),
  };
}

/**
 * Writes the explorer state into a search string. The country selection
 * clears at=; the assembled model clears depth= and cam=; standard values are
 * left out so the plain link stays short. cam= is only written on the land.
 */
export function writeUrlState(state: UrlFields): string {
  const params = new URLSearchParams();
  const at = encodeAt(state.at);
  if (at) params.set("at", at);
  if (state.view !== "model") params.set("view", state.view);
  if (state.metric !== "advertised") params.set("metric", state.metric);
  const depth = state.depth == null ? null : encodeDepth(state.depth);
  if (depth) params.set("depth", depth);
  const layers = state.layers?.length ? encodeLayers(state.layers) : null;
  if (layers) params.set("layers", layers);
  const camera = state.view === "land" ? encodeCamera(state.camera ?? null) : null;
  if (camera) params.set("cam", camera);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export { parentOf, selectionOf };
