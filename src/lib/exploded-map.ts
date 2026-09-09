import { DISTRICTS_BY_PROVINCE } from "./geo";
import { FARM_NOTICES } from "@/content/farm-notices";
import type { ProvinceCode } from "./types";
export const LAND_LAYERS = [
  {
    id: "land",
    name: "Land & boundaries",
    colour: "#80bfa3",
    description:
      "District boundaries provide the geographic frame. Open a verified parcel in the terrain view for its cadastral outline.",
  },
  {
    id: "soil",
    name: "Soil & suitability",
    colour: "#cfaa7c",
    description:
      "Soil samples and field assessments are still required. This slice organises soil information; its thickness and colour do not represent measured geology.",
  },
  {
    id: "climate",
    name: "Water & climate",
    colour: "#66c6dc",
    description:
      "Inspect a point in the terrain view for NASA rainfall and temperature estimates. River proximity does not establish irrigation rights.",
  },
  {
    id: "opportunity",
    name: "Government land",
    colour: "#cfe78b",
    description:
      "Reviewed government lease notices linked to this district. Confirm the deadline and offer status in the source notice.",
  },
] as const;
export type LandLayer = (typeof LAND_LAYERS)[number]["id"];
export function noticesForDistrict(province: ProvinceCode, id: string) {
  const district = DISTRICTS_BY_PROVINCE[province].find((d) => d.id === id);
  return district
    ? FARM_NOTICES.filter(
        (n) =>
          n.province === province &&
          district.name.toLowerCase().includes(n.district.toLowerCase()),
      )
    : [];
}
export function explosionOffset(
  centre: [number, number],
  parent: [number, number],
  amount: number,
): [number, number] {
  const dx = centre[0] - parent[0],
    dz = centre[1] - parent[1];
  const length = Math.hypot(dx, dz);
  const scale = (Math.max(0, Math.min(1, amount)) * 14) / Math.max(length, 8);
  return [dx * scale, dz * scale];
}
export function sliceHeight(index: number, amount: number) {
  return index * (0.7 + Math.max(0, Math.min(1, amount)) * 5);
}

/** Fit the model to the usable viewport, including narrow portrait canvases. */
export function modelDistance(span: number, aspect: number, fov = 38) {
  const distance =
    (Math.max(35, span) /
      (2 * Math.tan((fov * Math.PI) / 360)) /
      Math.max(0.2, Math.min(1, aspect))) *
    1.12;
  return Math.min(650, Math.max(50, distance));
}
export function spacedLabels(
  desired: number[],
  min: number,
  max: number,
  gap = 34,
): number[] {
  if (!desired.length) return [];
  const effective = Math.min(
    gap,
    Math.max(0, (max - min) / Math.max(1, desired.length - 1)),
  );
  const start = Math.max(
    min,
    Math.min(Math.min(...desired), max - effective * (desired.length - 1)),
  );
  return desired.map((_, i) => start + i * effective);
}
