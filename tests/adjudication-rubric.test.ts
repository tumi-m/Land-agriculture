import assert from "node:assert/strict";
import { test } from "node:test";
import { hashJson, sha256Hex, utf8 } from "../src/lib/adjudication/hash";
import {
  RUBRIC_VERSION,
  adjudicate,
  rubricCode,
  rubricCommitment,
  rubricWeights,
  scoreTotal,
  verifyScoreSet,
  type Rubric,
  type ScoreSet,
} from "../src/lib/adjudication/rubric";

/**
 * A fixed test round. Two criteria, three applications whose leaves are
 * recognisable hex digests (sha256-style strings of 64 hex chars, one per
 * applicant index). The scenario set is the smallest JSON that pins a
 * versioned rubric, and the salt is a fixed string so the commitment is
 * reproducible across runs.
 */
const RUBRIC: Rubric = {
  name: "test-round",
  criteria: [
    { id: "farming-record", weight: 2 },
    { id: "land-plan", weight: 3 },
  ],
};

const LEAVES = ["00", "11", "22"].map((pair) => pair.repeat(32));

const SCORE_SETS: ScoreSet[] = [
  { leaf: LEAVES[0], scores: { "farming-record": 5, "land-plan": 4 } },
  { leaf: LEAVES[1], scores: { "farming-record": 7, "land-plan": 3 } },
  { leaf: LEAVES[2], scores: { "farming-record": 7, "land-plan": 3 } },
];

const SCENARIO_SET = { scenarios: ["drought-year", "market-failure"] };
const SALT_R = "test-salt";

test("the rubric code carries the scorer version", () => {
  assert.equal(rubricCode(RUBRIC), `rubric:${RUBRIC_VERSION}:test-round`);
  assert.deepEqual(rubricWeights(RUBRIC), { "farming-record": 2, "land-plan": 3 });
});

test("the commitment reproduces across runs and moves with each input", async () => {
  const commitment = await rubricCommitment(RUBRIC, SCENARIO_SET, SALT_R);
  assert.match(commitment, /^[0-9a-f]{64}$/);
  assert.equal(
    await rubricCommitment(RUBRIC, SCENARIO_SET, SALT_R),
    commitment,
    "same inputs, same commitment",
  );
  const renamed: Rubric = { ...RUBRIC, name: "renamed-round" };
  assert.notEqual(
    await rubricCommitment(renamed, SCENARIO_SET, SALT_R),
    commitment,
    "renaming the code moves the commitment",
  );
  const reweighted: Rubric = {
    ...RUBRIC,
    criteria: [
      { id: "farming-record", weight: 1 },
      { id: "land-plan", weight: 3 },
    ],
  };
  assert.notEqual(
    await rubricCommitment(reweighted, SCENARIO_SET, SALT_R),
    commitment,
    "changing a weight moves the commitment",
  );
  assert.notEqual(
    await rubricCommitment(RUBRIC, { scenarios: ["market-failure"] }, SALT_R),
    commitment,
    "changing the scenario set moves the commitment",
  );
  assert.notEqual(
    await rubricCommitment(RUBRIC, SCENARIO_SET, "another-salt"),
    commitment,
    "changing the salt moves the commitment",
  );
});

test("a score total is the weighted sum, and refuses a missing criterion", async () => {
  assert.equal(scoreTotal(RUBRIC, { "farming-record": 5, "land-plan": 4 }), 22);
  assert.throws(
    () => scoreTotal(RUBRIC, { "farming-record": 5 }),
    TypeError,
    'criterion "land-plan" has no usable score',
  );
});

test("the ranking re-derives from the published scores", () => {
  const verdict = adjudicate(RUBRIC, SCORE_SETS);
  // Total order: leaf0 = 2*5 + 3*4 = 22, the two ties at 23 fall to the
  // leaf digest ("11..." < "22...").
  assert.deepEqual(
    verdict.map((row) => row.leaf),
    [LEAVES[1], LEAVES[2], LEAVES[0]],
  );
  assert.deepEqual(
    verdict.map((row) => row.total),
    [23, 23, 22],
  );
  assert.deepEqual(
    verdict.map((row) => row.rank),
    [0, 1, 2],
  );
});

test("ties break on the leaf digest no matter the input order", () => {
  const forward = adjudicate(RUBRIC, SCORE_SETS);
  const backward = adjudicate(RUBRIC, [...SCORE_SETS].reverse());
  assert.deepEqual(
    backward.map((row) => row.leaf),
    forward.map((row) => row.leaf),
  );
});

test("reordering a published score changes the verdict", async () => {
  const published = adjudicate(RUBRIC, SCORE_SETS);
  const publishedOrder = published.map((row) => row.leaf);
  const publishedTotals = Object.fromEntries(
    published.map((row) => [row.leaf, row.total]),
  );

  // The organiser's own scores verify clean.
  assert.equal(
    verifyScoreSet(RUBRIC, SCORE_SETS, publishedOrder, publishedTotals).ok,
    true,
  );

  // Swap one criterion between the two tied leaves: the totals stay within
  // the set, but the leaf-for-leaf mapping no longer holds.
  const swapped = SCORE_SETS.map((set) =>
    set.leaf === LEAVES[1]
      ? { ...set, scores: { ...set.scores, "farming-record": 8 } }
      : set,
  );
  const verdict = verifyScoreSet(RUBRIC, swapped, publishedOrder, publishedTotals);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, "total-mismatch");
  assert.equal(verdict.leaf, LEAVES[1]);
});

test("a reordered verdict fails with an order-mismatch naming the first moved leaf", () => {
  const published = adjudicate(RUBRIC, SCORE_SETS);
  const publishedTotals = Object.fromEntries(
    published.map((row) => [row.leaf, row.total]),
  );
  const reordered = [published[1].leaf, published[0].leaf, published[2].leaf];
  const verdict = verifyScoreSet(RUBRIC, SCORE_SETS, reordered, publishedTotals);
  assert.deepEqual(verdict, {
    ok: false,
    reason: "order-mismatch",
    leaf: LEAVES[1],
  });
});

test("weights that are not positive are refused at commitment time", async () => {
  await assert.rejects(
    () =>
      rubricCommitment(
        { name: "broken", criteria: [{ id: "x", weight: 0 }] },
        SCENARIO_SET,
        SALT_R,
      ),
    TypeError,
  );
  await assert.rejects(
    () =>
      rubricCommitment(
        { name: "broken", criteria: [{ id: "x", weight: Number.NaN }] },
        SCENARIO_SET,
        SALT_R,
      ),
    TypeError,
  );
});

test("a leaf that is not a round digest is refused before any ranking", () => {
  assert.throws(
    () =>
      adjudicate(RUBRIC, [
        { leaf: "not-a-digest", scores: { "farming-record": 1, "land-plan": 1 } },
      ]),
    TypeError,
  );
});

test("the commitment never aliases an application leaf over the same bytes", async () => {
  // The code string gets the scheme's leaf-style "/rubric/" domain. A bare
  // hash of the same string must differ, so a rubric commitment can never be
  // replayed as an application leaf.
  const codeDigest = await sha256Hex(utf8(rubricCode(RUBRIC)));
  const commitment = await rubricCommitment(RUBRIC, SCENARIO_SET, SALT_R);
  assert.notEqual(commitment, codeDigest);
  // And the commitment is not the hash of its JSON either — the four parts
  // are hashed separately, so changing the framing changes the digest.
  const framed = await hashJson([
    rubricCode(RUBRIC),
    rubricWeights(RUBRIC),
    SCENARIO_SET,
    SALT_R,
  ]);
  assert.notEqual(commitment, framed);
});
