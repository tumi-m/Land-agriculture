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
export interface LabelBox {
  id: string;
  /** Anchor in stage pixels. Labels are drawn translate(-50%, -100%). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Higher wins a collision and a place under the cap. */
  rank: number;
}

export interface LabelPlacement {
  /** Drawn in full, in the order they won their place. */
  shown: string[];
  /** Lost to a collision or the cap. The wrapper draws these as dots. */
  dotted: string[];
}

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function rectOf(box: LabelBox): Rect {
  return {
    left: box.x - box.width / 2,
    right: box.x + box.width / 2,
    top: box.y - box.height,
    bottom: box.y,
  };
}

function hits(a: Rect, b: Rect, pad: number): boolean {
  return (
    a.left < b.right + pad &&
    a.right > b.left - pad &&
    a.top < b.bottom + pad &&
    a.bottom > b.top - pad
  );
}

/**
 * How many labels a stage this wide can hold before it stops being a map.
 *
 * Nine provinces fit anywhere. Fifty-two districts do not: past about twenty
 * the text is the picture. The phone number is lower because the same count
 * of labels covers proportionally more of the land.
 */
export function labelCap(stageWidth: number): number {
  return stageWidth < 700 ? 10 : 20;
}

/** Ranks a label. Selected outranks hovered, which outranks plain size. */
export function labelRank(options: {
  selected?: boolean;
  hovered?: boolean;
  /** Any monotonic measure of the piece's size on screen. */
  area?: number;
}): number {
  if (options.selected) return 3_000_000;
  if (options.hovered) return 2_000_000;
  return Math.max(0, Math.min(1_000_000, options.area ?? 0));
}

/**
 * Chooses which labels are drawn in full.
 *
 * Greedy by rank: the strongest label keeps its place and every later one
 * that would touch it becomes a dot. That is why rank has to be a total
 * order — ties break on id so the same frame always resolves the same way
 * and labels do not flicker between two equally good arrangements.
 *
 * `pad` is the clear space demanded between two boxes. It is not zero: the
 * overlap check in the e2e helper tolerates two pixels, and a label that
 * merely touches its neighbour still reads as a collision.
 */
export function placeLabels(
  boxes: LabelBox[],
  cap: number,
  pad = 4,
): LabelPlacement {
  const order = [...boxes].sort(
    (a, b) => b.rank - a.rank || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const shown: string[] = [];
  const dotted: string[] = [];
  const taken: Rect[] = [];
  for (const box of order) {
    const rect = rectOf(box);
    if (shown.length >= cap || taken.some((other) => hits(other, rect, pad))) {
      dotted.push(box.id);
      continue;
    }
    taken.push(rect);
    shown.push(box.id);
  }
  return { shown, dotted };
}


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
