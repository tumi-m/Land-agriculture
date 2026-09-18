/**
 * Camera presets and framing for the exploded model. Pure maths and vectors,
 * no renderer: `ModelView` applies the result to its three.js camera and the
 * tests read the same numbers without starting WebGL.
 *
 * The direction vectors run from the target towards the camera, matching how
 * OrbitControls positions a camera. The angle a preset implies is a design
 * decision, so it lives here where a test can pin it.
 */
import * as THREE from "three";

export type CameraPresetId = "three-quarter" | "top" | "side";

export interface CameraPreset {
  id: CameraPresetId;
  label: string;
  /** Unit direction from the target towards the camera. */
  direction: THREE.Vector3;
}

const THREE_QUARTER = new THREE.Vector3(-0.18, 0.83, 1).normalize();

export const CAMERA_PRESETS: readonly CameraPreset[] = [
  { id: "three-quarter", label: "¾", direction: THREE_QUARTER },
  { id: "top", label: "Top", direction: new THREE.Vector3(0, 1, 0.2).normalize() },
  // Kept inside OrbitControls' maxPolarAngle (1.35 rad): a flatter angle is
  // clamped back by the controls and would stop reading as the Side preset.
  { id: "side", label: "Side", direction: new THREE.Vector3(-0.25, 0.3, 1).normalize() },
];

/** The resting angle for a fresh scene, and what Reset returns to. */
export const DEFAULT_PRESET: CameraPresetId = "three-quarter";

export function presetDirection(id: CameraPresetId): THREE.Vector3 {
  const preset = CAMERA_PRESETS.find((p) => p.id === id) ?? CAMERA_PRESETS[0];
  return preset.direction.clone();
}

/**
 * The camera angle a preset puts the scene in, written for `data-camera` so
 * e2e can prove a preset changed without reading pixels.
 */
export function cameraAngle(direction: THREE.Vector3): number {
  const horizontal = Math.hypot(direction.x, direction.z);
  const degrees = (Math.atan2(horizontal, direction.y) * 180) / Math.PI;
  return Math.round(degrees);
}

/**
 * Which preset, if any, the current camera direction matches. Tolerance is in
 * degrees so a damped orbit that has not fully settled still reads.
 */
export function presetFor(
  direction: THREE.Vector3,
  tolerance = 6,
): CameraPresetId | null {
  const unit = direction.clone().normalize();
  let best: CameraPresetId | null = null;
  let bestAngle = Infinity;
  for (const preset of CAMERA_PRESETS) {
    const dot = Math.min(1, Math.max(-1, unit.dot(preset.direction)));
    const angle = (Math.acos(dot) * 180) / Math.PI;
    if (angle < bestAngle) {
      bestAngle = angle;
      best = preset.id;
    }
  }
  return bestAngle <= tolerance ? best : null;
}

/**
 * The visible stage left over beside an open sheet on a wide viewport. On a
 * phone the sheet covers the bottom, which `camera.setViewOffset` handles
 * separately.
 */
export function sheetInset(
  viewportWidth: number,
  sheetWidth: number,
): number {
  if (sheetWidth <= 0) return 0;
  return Math.max(0, viewportWidth - sheetWidth);
}

/**
 * Frames a selection in the part of the canvas a sheet leaves free.
 *
 * `setViewOffset` renders the full frame but shows one sub-rectangle of it,
 * so the drawn region can stay full-bleed while the selection is centred in
 * what a person can actually see. Given the canvas size, the sheet's share of
 * the width and height and which edge it hugs, this returns the sub-rectangle
 * to show, or null for the full canvas.
 */
export function visibleViewRegion(
  width: number,
  height: number,
  inset: { left?: number; right?: number; top?: number; bottom?: number },
): { x: number; y: number; width: number; height: number } | null {
  const left = Math.max(0, inset.left ?? 0);
  const right = Math.max(0, inset.right ?? 0);
  const top = Math.max(0, inset.top ?? 0);
  const bottom = Math.max(0, inset.bottom ?? 0);
  const w = Math.round(width - left - right);
  const h = Math.round(height - top - bottom);
  if (w < 32 || h < 32 || (left === 0 && right === 0 && top === 0 && bottom === 0))
    return null;
  return { x: Math.round(left), y: Math.round(top), width: w, height: h };
}
