/**
 * Collision-aware label placement, as pure geometry.
 *
 * Shared by the model's projected labels (src/scene/labels.ts re-exports
 * it) and the land view's map markers. The caller measures its nodes and
 * applies the result; the rules live here so they can be tested without a
 * renderer or a map.
 */

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
