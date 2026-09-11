import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import BlockView from "../src/components/blocks/BlockView";
import { CATEGORIES } from "../src/content/categories";
import { FINANCE_TIERS } from "../src/content/finance";
import type { Block, BlockKind } from "../src/lib/blocks";
import { compose, EMPTY_ANSWERS, type Answers } from "../src/lib/pathfinder";

// One sample per kind, keyed by the full union: adding a kind to Block
// without a sample here is a type error, which fails the typecheck half of
// `npm run check`. Every entry references real content so a dangling lookup
// (unknown category, tier, province or risk) renders nothing and fails below.
const SAMPLES: Record<BlockKind, Block> = {
  verdict: { kind: "verdict", id: "s", category: CATEGORIES[1].id, because: "Sample reason." },
  blocker: { kind: "blocker", id: "s", severity: "wait", title: "Sample bar", detail: "Sample detail." },
  tenure: { kind: "tenure", id: "s", category: CATEGORIES[1].id },
  finance: { kind: "finance", id: "s", tier: FINANCE_TIERS[0], qualifies: true },
  office: { kind: "office", id: "s", province: "LP" },
  checklist: { kind: "checklist", id: "s", applicant: "individual" },
  timeline: { kind: "timeline", id: "s" },
  "province-fit": { kind: "province-fit", id: "s", province: "LP", matched: ["Poultry"], unmatched: ["Citrus"] },
  caution: { kind: "caution", id: "s", riskId: "tenure" },
  note: { kind: "note", id: "s", title: "Sample note", body: "Sample body.", tone: "neutral" },
};

function rendered(block: Block): string {
  return renderToStaticMarkup(<BlockView block={block} index={0} />);
}

test("every block kind renders meaningful markup with no leaks", () => {
  for (const [kind, block] of Object.entries(SAMPLES) as [BlockKind, Block][]) {
    const html = rendered(block);
    assert.ok(html.length > 50, `${kind} rendered nothing`);
    assert.ok(!html.includes("undefined"), `${kind} leaked undefined`);
    assert.ok(!html.includes("NaN"), `${kind} leaked NaN`);
  }
});

test("every block the engine emits renders in the registry", () => {
  const scales = ["household", "smallholder", "medium", "large"] as const;
  const seen = new Set<BlockKind>();
  for (const scale of scales) {
    for (const province of ["LP", null] as const) {
      const answers: Answers = {
        ...EMPTY_ANSWERS,
        province,
        scale,
        entity: "individual",
        employment: "none",
      };
      for (const block of compose(answers)) {
        seen.add(block.kind);
        const html = rendered(block);
        assert.ok(html.length > 50, `engine block ${block.kind} rendered nothing`);
        assert.ok(!html.includes("undefined"), `engine block ${block.kind} leaked undefined`);
      }
    }
  }
  assert.ok(seen.size >= 5, `engine sweep only reached ${[...seen].join(", ")}`);
});
