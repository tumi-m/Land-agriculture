import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import {
  CAMERA_PRESETS,
  DEFAULT_PRESET,
  cameraAngle,
  presetDirection,
  presetFor,
  sheetInset,
  visibleViewRegion,
} from "../src/scene/camera";

test("the three presets are unit directions with a known angle", () => {
  assert.equal(CAMERA_PRESETS.length, 3);
  assert.deepEqual(
    CAMERA_PRESETS.map((p) => p.id),
    ["three-quarter", "top", "side"],
  );
  for (const preset of CAMERA_PRESETS) {
    assert.ok(
      Math.abs(preset.direction.length() - 1) < 1e-6,
      `${preset.id} is not a unit direction`,
    );
  }
  // The top preset looks straight down (0° from vertical); the others are
  // lowered views, so a side-on cross-section reads as flat.
  assert.equal(cameraAngle(presetDirection("top")), 11);
  assert.ok(cameraAngle(presetDirection("three-quarter")) > 30);
  assert.ok(cameraAngle(presetDirection("side")) > 60);
});

test("presetFor finds the matching preset and rejects a free orbit", () => {
  assert.equal(presetFor(presetDirection("top")), "top");
  assert.equal(presetFor(presetDirection("side")), "side");
  assert.equal(presetFor(presetDirection("three-quarter")), "three-quarter");
  assert.equal(
    presetFor(new THREE.Vector3(0.7, 0.2, 0.7).normalize()),
    null,
    "an in-between angle is not claimed as a preset",
  );
  assert.equal(presetFor(presetDirection(DEFAULT_PRESET)), DEFAULT_PRESET);
});

test("the sheet inset leaves the stage beside a wide sheet", () => {
  assert.equal(sheetInset(1440, 400), 1040);
  assert.equal(sheetInset(1440, 1440), 0);
  assert.equal(sheetInset(390, 0), 0, "no sheet means no inset");
});

test("the visible region frames what the sheet leaves", () => {
  assert.deepEqual(
    visibleViewRegion(1440, 900, { right: 400 }),
    { x: 0, y: 0, width: 1040, height: 900 },
  );
  assert.deepEqual(
    visibleViewRegion(390, 844, { bottom: 320 }),
    { x: 0, y: 0, width: 390, height: 524 },
  );
  assert.equal(
    visibleViewRegion(1440, 900, {}),
    null,
    "no inset means no offset",
  );
  assert.equal(
    visibleViewRegion(1440, 900, { left: 0, right: 0, top: 0, bottom: 0 }),
    null,
  );
  assert.equal(
    visibleViewRegion(100, 100, { bottom: 90 }),
    null,
    "a sliver of a viewport is not framed",
  );
});
