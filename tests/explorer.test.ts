import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isolatedDistrict,
  parentOf,
  useExplorer,
  type Selection,
} from "../src/state/explorer";

/**
 * The explorer store is the single holder of view state. The 3D scene reads
 * it every frame through `getState`, so the model's camera, depth, peel,
 * isolate and hidden-slice controls must all be real store fields a user can
 * share, undo and test — not local component state.
 */

function reset() {
  useExplorer.setState({
    view: "model",
    selection: { kind: "country" },
    depth: 0,
    peel: 0,
    metric: "advertised",
    cameraPreset: "three-quarter",
    isolate: false,
    hidden: new Set<string>(),
    layers: new Set<string>(),
    camera: null,
    sheet: "none",
    sheetSnap: "half",
    openIds: new Set<string>(),
  });
}

test("the depth and peel sliders write the store, clamped by the UI only", () => {
  reset();
  useExplorer.getState().setDepth(0.72);
  useExplorer.getState().setPeel(0.82);
  assert.equal(useExplorer.getState().depth, 0.72);
  assert.equal(useExplorer.getState().peel, 0.82);
  // The URL grammar owns validation; the store records what it is given.
  useExplorer.getState().setDepth(0);
  assert.equal(useExplorer.getState().depth, 0, "Reassemble returns to rest");
});

test("the camera preset is shareable state that a free orbit clears", () => {
  reset();
  assert.equal(useExplorer.getState().cameraPreset, "three-quarter");
  useExplorer.getState().setCameraPreset("top");
  assert.equal(useExplorer.getState().cameraPreset, "top");
  useExplorer.getState().setCameraPreset(null);
  assert.equal(
    useExplorer.getState().cameraPreset,
    null,
    "an in-between angle is not claimed as a preset",
  );
});

test("isolate is a boolean the model can read and the sheet can toggle", () => {
  reset();
  assert.equal(useExplorer.getState().isolate, false);
  useExplorer.getState().setIsolate(true);
  assert.equal(useExplorer.getState().isolate, true);
});

test("hidden slices toggle by id and setHidden replaces the set whole", () => {
  reset();
  const { toggleHidden, setHidden } = useExplorer.getState();
  toggleHidden("soil");
  assert.deepEqual([...useExplorer.getState().hidden], ["soil"]);
  toggleHidden("climate");
  assert.deepEqual([...useExplorer.getState().hidden], ["soil", "climate"]);
  toggleHidden("soil");
  assert.deepEqual([...useExplorer.getState().hidden], ["climate"]);
  setHidden(new Set());
  assert.deepEqual([...useExplorer.getState().hidden], []);
});

test("isolatedDistrict only names a district when one is chosen", () => {
  const cases: [Selection, ReturnType<typeof isolatedDistrict>][] = [
    [{ kind: "country" }, null],
    [{ kind: "province", province: "LP" }, null],
    [{ kind: "notice", id: "cornucopia" }, null],
    [{ kind: "point", lng: 25, lat: -29 }, null],
    [{ kind: "parcel", sgCode: "A".repeat(21) }, null],
    [
      { kind: "district", province: "LP", district: "vhembe-district" },
      { province: "LP", district: "vhembe-district" },
    ],
    [
      {
        kind: "layer",
        province: "LP",
        district: "vhembe-district",
        layer: "soil",
      },
      { province: "LP", district: "vhembe-district" },
    ],
  ];
  for (const [selection, expected] of cases) {
    assert.deepEqual(
      isolatedDistrict(selection),
      expected,
      `${selection.kind} isolate rule`,
    );
  }
});

test("selecting a district then backing out keeps the store consistent", () => {
  reset();
  const store = () => useExplorer.getState();
  store().selectDistrict("LP", "vhembe-district");
  assert.deepEqual(store().selection, {
    kind: "district",
    province: "LP",
    district: "vhembe-district",
  });
  assert.deepEqual(parentOf(store().selection), {
    kind: "province",
    province: "LP",
  });
  store().selectDistrict("LP", null);
  assert.deepEqual(store().selection, { kind: "province", province: "LP" });
  store().selectProvince(null);
  assert.deepEqual(store().selection, { kind: "country" });
});
