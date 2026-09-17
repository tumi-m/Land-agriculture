import { create } from "zustand";
import type { Metric } from "@/lib/land-metrics";
import type { ProvinceCode } from "@/lib/types";

/**
 * Where the user is in the explorer. Selections form a tree — the country
 * narrows to a province, a province to a district, a district to one of its
 * four data layers — and notices, parcels, points and photos hang off the
 * land. A parcel is one cadastral farm found by its 21-character
 * Surveyor-General code; a photo is one moderated field photo.
 */
export type Selection =
  | { kind: "country" }
  | { kind: "province"; province: ProvinceCode }
  | { kind: "district"; province: ProvinceCode; district: string }
  | { kind: "layer"; province: ProvinceCode; district: string; layer: LandLayerId }
  | { kind: "notice"; id: string }
  | { kind: "parcel"; sgCode: string }
  | { kind: "point"; lng: number; lat: number }
  | { kind: "photo"; id: string };

/** The four exploded-model slices, from src/lib/exploded-map.ts. */
export type LandLayerId = "land" | "soil" | "climate" | "opportunity";

/**
 * Which half of the journey is on screen: the exploded model, or the real
 * land. The compare figures and the outline hang off the model. The old
 * `anatomy` / `atlas` / `data` names resolve to these on read; see url.ts.
 */
export type ViewName = "model" | "land";

/** One open panel at a time, over or beside the stage. */
export type SheetName =
  | "none"
  | "inspect"
  | "layers"
  | "search"
  | "about"
  | "add-photo";

export type SheetSnap = "peek" | "half" | "full";

/** The camera's shareable pose on the land. Written only for view="land". */
export interface CameraPose {
  lng: number;
  lat: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface ExplorerState {
  view: ViewName;
  selection: Selection;
  /** Depth of the exploded model, 0 assembled to 1 fully separated. */
  depth: number;
  /** Historical measure for the province solids (0.5 height shows). */
  metric: Metric;
  /** The map layer defs currently on, by def id. */
  layers: Set<string>;
  /** The land camera's last shareable pose; not written for the model. */
  camera: CameraPose | null;
  sheet: SheetName;
  sheetSnap: SheetSnap;
  openIds: Set<string>;

  selectCountry: () => void;
  selectProvince: (province: ProvinceCode | null) => void;
  selectDistrict: (province: ProvinceCode, district: string | null) => void;
  selectLayer: (province: ProvinceCode, district: string, layer: LandLayerId) => void;
  selectNotice: (id: string | null) => void;
  selectParcel: (sgCode: string | null) => void;
  selectPoint: (point: { lng: number; lat: number } | null) => void;
  selectPhoto: (id: string | null) => void;
  /** One level out, the same thing Escape does. */
  back: () => void;
  setView: (view: ViewName) => void;
  setDepth: (depth: number) => void;
  setMetric: (metric: Metric) => void;
  toggleLayer: (id: string) => void;
  setCamera: (pose: CameraPose | null) => void;
  openSheet: (sheet: SheetName) => void;
  closeSheet: () => void;
  setSheetSnap: (snap: SheetSnap) => void;
  toggleOpen: (id: string) => void;
}

/** The selection a view switch back to the model clears back to. */
export function selectionOf(
  province: ProvinceCode | null,
  district: string | null,
  noticeId: string | null,
  point: { lng: number; lat: number } | null,
): Selection {
  if (noticeId) return { kind: "notice", id: noticeId };
  if (point) return { kind: "point", lng: point.lng, lat: point.lat };
  if (district && province)
    return { kind: "district", province, district };
  if (province) return { kind: "province", province };
  return { kind: "country" };
}

/** One level out, the same thing Escape does. */
export function parentOf(selection: Selection): Selection {
  switch (selection.kind) {
    case "country":
      return selection;
    case "province":
      return { kind: "country" };
    case "district":
    case "layer":
      return { kind: "province", province: selection.province };
    case "notice":
    case "parcel":
    case "point":
    case "photo":
      return { kind: "country" };
  }
}

const initialLayers = new Set<string>();

export const useExplorer = create<ExplorerState>((set) => ({
  view: "model",
  selection: { kind: "country" },
  depth: 0,
  metric: "advertised",
  layers: initialLayers,
  camera: null,
  sheet: "none",
  sheetSnap: "half",
  openIds: new Set<string>(),

  selectCountry: () => set({ selection: { kind: "country" }, sheet: "none" }),
  selectProvince: (province) =>
    set(
      province
        ? { selection: { kind: "province", province }, sheet: "none" }
        : { selection: { kind: "country" }, sheet: "none" },
    ),
  selectDistrict: (province, district) =>
    set(
      district
        ? { selection: { kind: "district", province, district }, sheet: "none" }
        : { selection: { kind: "province", province }, sheet: "none" },
    ),
  selectLayer: (province, district, layer) =>
    set({ selection: { kind: "layer", province, district, layer }, sheet: "inspect" }),
  selectNotice: (id) =>
    set(
      id
        ? { selection: { kind: "notice", id }, sheet: "inspect" }
        : { selection: { kind: "country" }, sheet: "none" },
    ),
  selectParcel: (sgCode) =>
    set(
      sgCode
        ? { selection: { kind: "parcel", sgCode }, sheet: "inspect" }
        : { selection: { kind: "country" }, sheet: "none" },
    ),
  selectPoint: (point) =>
    set(
      point
        ? { selection: { kind: "point", lng: point.lng, lat: point.lat }, sheet: "inspect" }
        : { selection: { kind: "country" }, sheet: "none" },
    ),
  selectPhoto: (id) =>
    set(
      id
        ? { selection: { kind: "photo", id }, sheet: "inspect" }
        : { selection: { kind: "country" }, sheet: "none" },
    ),
  back: () => set((state) => ({ selection: parentOf(state.selection) })),
  setView: (view) => set({ view, sheet: "none" }),
  setDepth: (depth) => set({ depth }),
  setMetric: (metric) => set({ metric }),
  toggleLayer: (id) =>
    set((state) => {
      const layers = new Set(state.layers);
      if (layers.has(id)) layers.delete(id);
      else layers.add(id);
      return { layers };
    }),
  setCamera: (pose) => set({ camera: pose }),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: "none" }),
  setSheetSnap: (snap) => set({ sheetSnap: snap }),
  toggleOpen: (id) =>
    set((state) => {
      const openIds = new Set(state.openIds);
      if (openIds.has(id)) openIds.delete(id);
      else openIds.add(id);
      return { openIds };
    }),
}));
