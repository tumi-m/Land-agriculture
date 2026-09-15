import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHOSEN_LIFT,
  DISTRICT_LIFT,
  STAGES,
  chosenDistrict,
  focusProvince,
  pieceTransforms,
  smoothstep,
  stageProgress,
  type DepthInput,
  type DistrictPiece,
  type PieceTransform,
  type ProvincePiece,
} from "../src/scene/depth";
import type { Selection } from "../src/state/explorer";

/**
 * The depth maths as numbers, without a renderer. The pieces here are fixtures
 * with the same shape the scene builder produces: a centre in scene units.
 * Positions are chosen so the country centre is not a province centre, which
 * is what stage A moves away from.
 */
const provinces: ProvincePiece[] = [
  { id: "LP", centre: [10, 0] },
  { id: "NC", centre: [-12, -4] },
  { id: "WC", centre: [-10, 8] },
];

const districts: DistrictPiece[] = [
  { id: "vhembe", province: "LP", centre: [12, 1] },
  { id: "capricorn", province: "LP", centre: [9, 2] },
  { id: "namakwa", province: "NC", centre: [-13, -5] },
  { id: "cape-winlands", province: "WC", centre: [-9, 9] },
];

function transforms(depth: number, selection: Selection = { kind: "country" }, everyLayer = false) {
  const input: DepthInput = { depth, selection, provinces, districts, everyLayer };
  return pieceTransforms(input);
}

function at(map: Map<string, PieceTransform>, id: string): PieceTransform {
  const value = map.get(id);
  assert.ok(value, `no transform for ${id}`);
  return value;
}

test("smoothstep is 0 at 0, 1 at 1 and eases in between", () => {
  assert.equal(smoothstep(0), 0);
  assert.equal(smoothstep(1), 1);
  assert.equal(smoothstep(0.5), 0.5);
  assert.ok(smoothstep(0.25) < 0.25, "eases in");
  assert.ok(smoothstep(0.75) > 0.75, "eases out");
  assert.equal(smoothstep(-1), 0, "below the range clamps");
  assert.equal(smoothstep(2), 1, "above the range clamps");
});

test("stageProgress spans its own window and clamps outside it", () => {
  assert.equal(stageProgress(0, STAGES.provinces), 0);
  assert.equal(stageProgress(0.33, STAGES.provinces), 1);
  assert.equal(stageProgress(0.1, STAGES.provinces), smoothstep(0.1 / 0.33));
  assert.equal(stageProgress(0.2, STAGES.districts), 0, "before its window");
  assert.equal(stageProgress(0.9, STAGES.districts), 1, "after its window");
  assert.equal(stageProgress(1, STAGES.layers), 1);
});

test("at depth 0 every piece rests", () => {
  const map = transforms(0);
  for (const id of ["LP", "NC", "WC", "vhembe", "capricorn", "namakwa", "cape-winlands"]) {
    assert.deepEqual(
      at(map, id),
      { offsetX: 0, offsetZ: 0, lift: 0, layerGap: 0, ghost: false },
      `${id} must rest at depth 0`,
    );
  }
});

test("at 0.33 provinces are fully apart and districts are at rest", () => {
  const map = transforms(STAGES.provinces[1]);
  const province = at(map, "LP");
  assert.ok(
    Math.hypot(province.offsetX, province.offsetZ) > 0,
    "Limpopo must have moved once its province stage completes",
  );
  for (const id of ["vhembe", "capricorn", "namakwa", "cape-winlands"]) {
    const district = at(map, id);
    assert.equal(district.offsetX, 0, `${id} must not move before its stage`);
    assert.equal(district.offsetZ, 0, `${id} must not move before its stage`);
    assert.equal(district.layerGap, 0, `${id} must not separate before stage C`);
  }
});

test("at 1 the layer gaps are at maximum and districts have moved out", () => {
  const map = transforms(1);
  const vhembe = at(map, "vhembe");
  assert.equal(vhembe.layerGap, 1, "layerGap is the full stage-C amount");
  assert.ok(
    Math.hypot(vhembe.offsetX, vhembe.offsetZ) > 0,
    "the district stage runs before the layer stage",
  );
  const province = at(map, "LP");
  assert.ok(
    Math.hypot(province.offsetX, province.offsetZ) > 0,
    "the province stage runs before both",
  );
});

test("offsets only ever grow as depth rises", () => {
  const distances = new Map<string, number>();
  for (let depth = 0; depth <= 1.0001; depth += 0.05) {
    const map = transforms(Number(depth.toFixed(2)));
    const ids = ["LP", "NC", "WC", "vhembe", "capricorn", "namakwa", "cape-winlands"];
    for (const id of ids) {
      const { offsetX, offsetZ, layerGap, lift } = at(map, id);
      const distance = Math.hypot(offsetX, offsetZ) + layerGap + lift;
      const previous = distances.get(id) ?? 0;
      assert.ok(
        distance >= previous - 1e-9,
        `${id} moved backwards at depth ${depth.toFixed(2)}: ${previous} -> ${distance}`,
      );
      distances.set(id, distance);
    }
  }
});

test("a selected province keeps its districts moving and ghosts the rest", () => {
  const selection: Selection = { kind: "province", province: "LP" };
  const map = transforms(0.5, selection);

  for (const id of ["NC", "WC"] as const) {
    const piece = at(map, id);
    assert.equal(piece.ghost, true, `${id} is outside the selection`);
    // Stage A still separates every province; ghosting is about emphasis.
    // What must not happen is a ghosted province's districts moving in stage B.
    const firstMove = at(transforms(0.34, selection), id);
    const laterMove = at(transforms(0.5, selection), id);
    assert.equal(
      Math.hypot(laterMove.offsetX - firstMove.offsetX, laterMove.offsetZ - firstMove.offsetZ),
      0,
      `${id} must not move during the district stage`,
    );
    assert.ok(
      Math.hypot(piece.offsetX, piece.offsetZ) > 0,
      `${id} still separates with the others in stage A`,
    );
  }
  assert.equal(at(map, "LP").ghost, false, "the selected province stays solid");
  assert.ok(
    Math.hypot(at(map, "vhembe").offsetX, at(map, "vhembe").offsetZ) > 0,
    "a district inside the selection moves out",
  );
  assert.equal(
    Math.hypot(at(map, "namakwa").offsetX, at(map, "namakwa").offsetZ),
    0,
    "a district outside the selection stays put",
  );
});

test("a selected district separates alone unless Every layer is on", () => {
  const selection: Selection = {
    kind: "district",
    province: "LP",
    district: "vhembe",
  };
  const alone = transforms(0.9, selection);
  assert.ok(at(alone, "vhembe").layerGap > 0, "the chosen district separates");
  assert.equal(
    at(alone, "capricorn").layerGap,
    0,
    "its neighbour stays stacked",
  );

  const every = transforms(0.9, selection, true);
  assert.ok(at(every, "capricorn").layerGap > 0, "every visible district separates");
});

test("a chosen district lifts higher than its neighbours", () => {
  const selection: Selection = {
    kind: "district",
    province: "LP",
    district: "vhembe",
  };
  const map = transforms(0.66, selection);
  assert.equal(at(map, "vhembe").lift, CHOSEN_LIFT);
  assert.equal(at(map, "capricorn").lift, DISTRICT_LIFT);
  assert.ok(CHOSEN_LIFT > DISTRICT_LIFT, "the chosen lift must stand out");
});

test("focusProvince and chosenDistrict read the selection kinds", () => {
  assert.equal(focusProvince({ kind: "country" }), null);
  assert.equal(focusProvince({ kind: "notice", id: "cornucopia" }), null);
  assert.equal(focusProvince({ kind: "point", lng: 25, lat: -29 }), null);
  assert.equal(focusProvince({ kind: "province", province: "NC" }), "NC");
  assert.equal(
    focusProvince({ kind: "district", province: "LP", district: "vhembe" }),
    "LP",
  );
  assert.equal(
    focusProvince({
      kind: "layer",
      province: "LP",
      district: "vhembe",
      layer: "soil",
    }),
    "LP",
  );

  assert.equal(chosenDistrict({ kind: "country" }), null);
  assert.deepEqual(
    chosenDistrict({ kind: "district", province: "LP", district: "vhembe" }),
    { province: "LP", district: "vhembe" },
  );
  assert.deepEqual(
    chosenDistrict({
      kind: "layer",
      province: "LP",
      district: "vhembe",
      layer: "soil",
    }),
    { province: "LP", district: "vhembe" },
  );
});

test("the transforms are deterministic", () => {
  const first = transforms(0.62, { kind: "province", province: "LP" });
  const second = transforms(0.62, { kind: "province", province: "LP" });
  assert.deepEqual([...first.entries()], [...second.entries()]);
});
