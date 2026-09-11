import { create } from "zustand";
import type { Metric } from "@/lib/land-metrics";
import type { ProvinceCode } from "@/lib/types";

/**
 * Where the user is in the explorer. Selections form a tree — the country
 * narrows to a province, a province to a district, a district to one of its
 * four data layers — and notices, parcels and points hang off the map.
 */
export type Selection =
  | { kind: "country" }
  | { kind: "province"; province: ProvinceCode }
  | { kind: "district"; province: ProvinceCode; district: string }
  | { kind: "layer"; province: ProvinceCode; district: string; layer: LandLayerId }
  | { kind: "notice"; id: string }
  | { kind: "point"; lng: number; lat: number };

/** The four exploded-model slices, from src/lib/exploded-map.ts. */
export type LandLayerId = "land" | "soil" | "climate" | "opportunity";

/** Which half of the journey is on screen. */
export type ViewName = "anatomy" | "atlas" | "data";

/** One open panel at a time, over or beside the stage. */
export type SheetName = "none" | "inspect" | "search";

export interface ExplorerState {
  view: ViewName;
  selection: Selection;
  /** Historical measure for the province solids (0.5 height shows). */
  metric: Metric;
  sheet: SheetName;
  openIds: Set<string>;

  selectCountry: () => void;
  selectProvince: (province: ProvinceCode | null) => void;
  selectDistrict: (province: ProvinceCode, district: string | null) => void;
  selectLayer: (province: ProvinceCode, district: string, layer: LandLayerId) => void;
  selectNotice: (id: string | null) => void;
  selectPoint: (point: { lng: number; lat: number } | null) => void;
  setView: (view: ViewName) => void;
  setMetric: (metric: Metric) => void;
  openSheet: (sheet: SheetName) => void;
  closeSheet: () => void;
  toggleOpen: (id: string) => void;
}

/** The selection a view switch to "anatomy" clears back to. */
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
    case "point":
      return { kind: "country" };
  }
}

export const useExplorer = create<ExplorerState>((set) => ({
  view: "anatomy",
  selection: { kind: "country" },
  metric: "advertised",
  sheet: "none",
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
  selectPoint: (point) =>
    set(
      point
        ? { selection: { kind: "point", lng: point.lng, lat: point.lat }, sheet: "inspect" }
        : { selection: { kind: "country" }, sheet: "none" },
    ),
  setView: (view) => set({ view, sheet: "none" }),
  setMetric: (metric) => set({ metric }),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: "none" }),
  toggleOpen: (id) =>
    set((state) => {
      const openIds = new Set(state.openIds);
      if (openIds.has(id)) openIds.delete(id);
      else openIds.add(id);
      return { openIds };
    }),
}));
