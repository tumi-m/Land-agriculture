/**
 * Label geometry for the exploded model: where a label's anchor sits on
 * screen, and how the slice labels are spread down the side of the stage.
 * Positioning the DOM nodes is the wrapper's job; the numbers live here so
 * they can be tested without a renderer.
 *
 * Collision-aware placement (priority ordering, caps, leftover dots) lives
 * here too, as pure geometry: the wrapper measures the nodes and applies the
 * result, so the rules can be tested without a renderer.
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


/** A label's box on the stage, and how hard it fights to keep its place. */
// Collision placement is plain geometry with no renderer in it, and the
// land view needs the same rules for its map markers, so it lives in
// src/lib/placement.ts where MapLibre code can use it without pulling three.
export {
  labelCap,
  labelRank,
  placeLabels,
  type LabelBox,
  type LabelPlacement,
} from "@/lib/placement";

/**
 * Pulls a label's anchor back inside the stage.
 *
 * A label near the edge is drawn translate(-50%, -100%), so half its width
 * hangs past its anchor and the last provinces on the right ran off the
 * screen — as unreadable as one buried under another. Clamping the anchor
 * keeps the whole box on the stage; the piece it names is still under it,
 * just off-centre.
 */
export function clampLabelPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  stageWidth: number,
  stageHeight: number,
  margin = 6,
): { x: number; y: number } {
  const half = width / 2;
  // A label wider than the stage cannot be fully inside it; pin it left
  // rather than letting the clamp invert and push it off the other edge.
  const minX = half + margin;
  const maxX = stageWidth - half - margin;
  return {
    x: maxX < minX ? minX : Math.max(minX, Math.min(x, maxX)),
    y: Math.max(height + margin, Math.min(y, stageHeight - margin)),
  };
}
