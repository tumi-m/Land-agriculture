/**
 * One 0–1 depth slider drives the whole exploded model. This module turns a
 * depth into a position for every piece, as pure numbers, so the scene wrapper
 * only has to apply them.
 *
 * Three stages run across the slider, each easing in and out with a smoothstep
 * so nothing starts or stops abruptly:
 *
 *   Stage A (0.00–0.33)  provinces move out from the national centre
 *   Stage B (0.33–0.66)  districts move out from their province's centre
 *   Stage C (0.66–1.00)  the four layer slabs separate vertically
 *
 * The maths is the same the pre-refactor scene ran, kept here as functions so
 * it can be tested without a renderer. `src/scene/depth.ts` never imports
 * three.js.
 */
import { explosionOffset } from "@/lib/exploded-map";
import type { Selection } from "@/state/explorer";
import type { ProvinceCode } from "@/lib/types";

/** A province piece, positioned by its bounding-centre in scene units. */
export interface ProvincePiece {
  id: ProvinceCode;
  /** x/z centre in scene units, exactly as the piece builder lays it out. */
  centre: [number, number];
}

/** A district piece, in the same space as the province pieces. */
export interface DistrictPiece {
  id: string;
  province: ProvinceCode;
  centre: [number, number];
}

export interface PieceTransform {
  offsetX: number;
  offsetZ: number;
  lift: number;
  /**
   * The stage-C amount to hand `sliceHeight`: 0 stacked, 1 fully separated.
   * Provinces are one slab each and always read 0.
   */
  layerGap: number;
  /** Dimmed because a narrower selection is in view. Districts never ghost. */
  ghost: boolean;
}

export interface DepthInput {
  depth: number;
  selection: Selection;
  provinces: ProvincePiece[];
  districts: DistrictPiece[];
  /** Stage C for every visible district, not just a chosen one. */
  everyLayer?: boolean;
}

/** Where each stage runs on the slider. Exported so tests read the same map. */
export const STAGES = {
  provinces: [0, 0.33],
  districts: [0.33, 0.66],
  layers: [0.66, 1],
} as const satisfies Record<string, readonly [number, number]>;

/** Lift in scene units: every visible district rises, the chosen one further. */
export const DISTRICT_LIFT = 3;
export const CHOSEN_LIFT = 7;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Multiplying a negative coordinate by zero yields -0, which tests and
 *  equality checks read as a different number. Offsets are distances; make
 *  the sign of zero the same as everything else. */
function zeroSafe(value: number): number {
  return value === 0 ? 0 : value;
}

/** 0 at 0, 1 at 1, smooth in between — no abrupt start at a stage boundary. */
export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** The stage's own 0–1 amount at a given depth. */
export function stageProgress(
  depth: number,
  stage: readonly [number, number],
): number {
  const [start, end] = stage;
  return smoothstep((clamp01(depth) - start) / (end - start));
}

/** The province a selection sits inside, if it sits inside one. */
export function focusProvince(selection: Selection): ProvinceCode | null {
  switch (selection.kind) {
    case "province":
    case "district":
    case "layer":
      return selection.province;
    default:
      return null;
  }
}

/** The district a selection has opened, if it has opened one. */
export function chosenDistrict(
  selection: Selection,
): { province: ProvinceCode; district: string } | null {
  switch (selection.kind) {
    case "district":
    case "layer":
      return { province: selection.province, district: selection.district };
    default:
      return null;
  }
}

function meanCentre(pieces: ProvincePiece[]): [number, number] {
  if (pieces.length === 0) return [0, 0];
  let x = 0;
  let z = 0;
  for (const piece of pieces) {
    x += piece.centre[0];
    z += piece.centre[1];
  }
  return [x / pieces.length, z / pieces.length];
}

/**
 * The transform for every piece at this depth. Pieces not yet moving sit at
 * rest: all zero offsets, no lift, no gap, not ghosted.
 */
export function pieceTransforms(input: DepthInput): Map<string, PieceTransform> {
  const depth = clamp01(input.depth);
  const stageA = stageProgress(depth, STAGES.provinces);
  const stageB = stageProgress(depth, STAGES.districts);
  const stageC = stageProgress(depth, STAGES.layers);
  const focus = focusProvince(input.selection);
  const chosen = chosenDistrict(input.selection);
  const country = meanCentre(input.provinces);

  const transforms = new Map<string, PieceTransform>();

  for (const province of input.provinces) {
    const [offsetX, offsetZ] = explosionOffset(
      province.centre,
      country,
      stageA,
    );
    transforms.set(province.id, {
      offsetX: zeroSafe(offsetX),
      offsetZ: zeroSafe(offsetZ),
      lift: 0,
      layerGap: 0,
      ghost: focus !== null && province.id !== focus,
    });
  }

  for (const district of input.districts) {
    const inFocus = focus === null || district.province === focus;
    const parent =
      input.provinces.find((province) => province.id === district.province)
        ?.centre ?? district.centre;
    const [offsetX, offsetZ] = inFocus
      ? explosionOffset(district.centre, parent, stageB)
      : [0, 0];
    const isChosen =
      chosen !== null &&
      chosen.district === district.id &&
      chosen.province === district.province;
    const separated = input.everyLayer ? true : chosen ? isChosen : inFocus;
    transforms.set(district.id, {
      offsetX: zeroSafe(offsetX),
      offsetZ: zeroSafe(offsetZ),
      lift: inFocus ? (isChosen ? CHOSEN_LIFT : DISTRICT_LIFT) * stageB : 0,
      layerGap: separated ? stageC : 0,
      ghost: false,
    });
  }

  return transforms;
}
