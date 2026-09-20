import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampLabelPoint,
  labelCap,
  labelRank,
  placeLabels,
  type LabelBox,
} from "../src/scene/labels";

/**
 * The defect these rules fix: at country scale the phone stacked Limpopo,
 * North West, Mpumalanga, Northern Cape, Western Cape and Natal on top of
 * each other, each with a notice count under it, so none of them could be
 * read and several could not be tapped.
 */

const box = (id: string, x: number, y: number, rank = 0): LabelBox => ({
  id,
  x,
  y,
  width: 100,
  height: 20,
  rank,
});

/** Labels are drawn translate(-50%, -100%), so this is their real box. */
function rect(b: LabelBox) {
  return {
    left: b.x - b.width / 2,
    right: b.x + b.width / 2,
    top: b.y - b.height,
    bottom: b.y,
  };
}

test("no two labels that are drawn can overlap", () => {
  // Nine labels piled within a few pixels of each other: the worst case the
  // country view actually produces.
  const boxes = Array.from({ length: 9 }, (_, i) =>
    box(`p${i}`, 200 + i * 3, 300 + i * 2, i),
  );
  const { shown } = placeLabels(boxes, 20);
  const drawn = boxes.filter((b) => shown.includes(b.id));
  for (const a of drawn) {
    for (const b of drawn) {
      if (a.id === b.id) continue;
      const [ra, rb] = [rect(a), rect(b)];
      const overlaps =
        ra.left < rb.right && ra.right > rb.left &&
        ra.top < rb.bottom && ra.bottom > rb.top;
      assert.ok(!overlaps, `${a.id} and ${b.id} overlap`);
    }
  }
  assert.ok(drawn.length >= 1, "something must survive");
});

test("the selected label always keeps its place", () => {
  // It is the one the user asked for, so it outranks a bigger neighbour.
  const boxes = [
    box("big", 200, 300, labelRank({ area: 999_999 })),
    box("chosen", 205, 302, labelRank({ selected: true })),
    box("hovered", 210, 304, labelRank({ hovered: true })),
  ];
  const { shown } = placeLabels(boxes, 20);
  assert.equal(shown[0], "chosen");
});

test("hovered outranks size, and size orders the rest", () => {
  assert.ok(labelRank({ selected: true }) > labelRank({ hovered: true }));
  assert.ok(labelRank({ hovered: true }) > labelRank({ area: 999_999 }));
  assert.ok(labelRank({ area: 500 }) > labelRank({ area: 100 }));
});

test("the cap holds and the overflow becomes dots, losing nobody", () => {
  // Fifty-two districts, none colliding, on a phone.
  const boxes = Array.from({ length: 52 }, (_, i) =>
    box(`d${i}`, 200, 300 + i * 100, i),
  );
  const { shown, dotted } = placeLabels(boxes, labelCap(390));
  assert.equal(shown.length, 10);
  assert.equal(dotted.length, 42);
  // Every label is accounted for exactly once: a dropped id would be a
  // district that silently cannot be tapped.
  assert.deepEqual([...shown, ...dotted].sort(), boxes.map((b) => b.id).sort());
});

test("a wider stage carries more labels", () => {
  assert.equal(labelCap(390), 10);
  assert.equal(labelCap(1440), 20);
});

test("the same frame always resolves the same way", () => {
  // Equal ranks must not let two arrangements alternate between frames:
  // that reads as flicker, not as a map.
  const boxes = [box("b", 200, 300, 5), box("a", 203, 301, 5), box("c", 206, 302, 5)];
  const first = placeLabels(boxes, 20);
  const again = placeLabels([...boxes].reverse(), 20);
  assert.deepEqual(first, again);
  assert.equal(first.shown[0], "a", "ties break on id, not input order");
});

test("labels that are far apart are all drawn", () => {
  const boxes = [box("a", 100, 100), box("b", 400, 100), box("c", 700, 100)];
  const { shown, dotted } = placeLabels(boxes, 20);
  assert.equal(shown.length, 3);
  assert.equal(dotted.length, 0);
});

test("a label touching its neighbour is still a collision", () => {
  // Exactly adjacent boxes: no pixel overlaps, but the text runs together.
  const boxes = [box("a", 100, 100, 2), box("b", 200, 100, 1)];
  assert.equal(placeLabels(boxes, 20).dotted.length, 1);
});

/**
 * Edge clamping. At 390px the eastern provinces ran off the right of the
 * stage: Mpumalanga and KwaZulu-Natal were cut in half by the viewport.
 */

test("a label near the edge is pulled fully onto the stage", () => {
  const { x } = clampLabelPoint(385, 300, 100, 20, 390, 844);
  assert.equal(x, 390 - 50 - 6, "the right edge must clear the stage");
  assert.equal(clampLabelPoint(2, 300, 100, 20, 390, 844).x, 56);
});

test("a label already inside is left where the piece is", () => {
  const { x, y } = clampLabelPoint(200, 400, 100, 20, 390, 844);
  assert.equal(x, 200);
  assert.equal(y, 400);
});

test("the top and bottom are clamped too, by the label's own height", () => {
  assert.equal(clampLabelPoint(200, 4, 100, 20, 390, 844).y, 26);
  assert.equal(clampLabelPoint(200, 900, 100, 20, 390, 844).y, 838);
});

test("a label wider than the stage is pinned, never pushed off the far side", () => {
  // The clamp range inverts here; without the guard it would return a
  // negative x and the label would leave the screen entirely.
  const { x } = clampLabelPoint(200, 300, 600, 20, 390, 844);
  assert.ok(x >= 0, `pinned label went off-stage at x=${x}`);
  assert.equal(x, 306);
});
