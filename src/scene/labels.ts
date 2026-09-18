/**
 * Label geometry for the exploded model: where a label's anchor sits on
 * screen, and how the slice labels are spread down the side of the stage.
 * Positioning the DOM nodes is the wrapper's job; the numbers live here so
 * they can be tested without a renderer.
 *
 * Collision-aware placement (priority ordering, caps, leftover dots) is M1.4
 * and lands in this module; M1.3 keeps the scene split behaviour-neutral.
 */
import * as THREE from "three";

export interface ScreenPoint {
  x: number;
  y: number;
  /** True while the point is behind the camera or outside the depth range. */
  behind: boolean;
}

const projected = new THREE.Vector3();

/** Projects a world point into stage pixels, with -1..1 visibility in depth. */
export function projectToScreen(
  point: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number,
): ScreenPoint {
  projected.copy(point).project(camera);
  const x = ((projected.x + 1) / 2) * width;
  const y = ((1 - projected.y) / 2) * height;
  const behind = projected.z < -1 || projected.z > 1;
  return { x, y, behind };
}

/** Where a label's anchor sits for a piece whose top has lifted `lift` units. */
export function pieceAnchor(
  centre: THREE.Vector3,
  lift: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  return out.set(centre.x, lift, centre.z);
}

/**
 * The left edge for a slice label, kept inside the stage. Slice labels are
 * wide controls pinned to a leader line, so they are clamped rather than
 * centred.
 */
export function clampLabelX(
  x: number,
  labelWidth: number,
  stageWidth: number,
  margin = 8,
): number {
  return Math.max(margin, Math.min(x - labelWidth * 0.7, stageWidth - labelWidth - margin));
}
