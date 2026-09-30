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
  sheetViewOffset,
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

test("an open sheet shifts the view into the free space instead of zooming it", () => {
  // A 400 px side panel on the right: the frame's centre moves 200 px left,
  // into the middle of the 1040 px that are left, and the camera stands back
  // by the ratio of the widths so the piece still fits.
  const side = sheetViewOffset(1440, 900, { right: 400 })!;
  assert.equal(side.x, 200);
  assert.equal(side.y, 0);
  assert.ok(Math.abs(side.scale - 1440 / 1040) < 1e-9);
  // A bottom sheet on a phone moves the centre up by half its height.
  const bottom = sheetViewOffset(390, 844, { bottom: 320 })!;
  assert.equal(bottom.x, 0);
  assert.equal(bottom.y, 160);
  // A sheet covering almost everything cannot be framed around, and the
  // stand-back is capped so the model never shrinks to a speck.
  assert.equal(sheetViewOffset(100, 100, { bottom: 90 }), null);
  assert.ok(sheetViewOffset(1000, 800, { right: 900 })!.scale <= 1.8);
  assert.equal(sheetViewOffset(1440, 900, {}), null);
});
