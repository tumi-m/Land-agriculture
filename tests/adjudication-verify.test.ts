import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applicationPayload,
  parseReceipt,
  parseReceiptText,
  verifyReceipt,
  type RoundReceipt,
} from "../src/lib/adjudication/verify";
import { inclusionPath, leafHash, merkleRoot } from "../src/lib/adjudication/merkle";
import {
  adjudicate,
  rubricCommitment,
  type Rubric,
  type ScoreSet,
} from "../src/lib/adjudication/rubric";

/**
 * A generated test vector, not sample data: three applications under one
 * rubric, committed, tallied and rooted with the scheme's own functions.
 * Nothing here ships; it exists so the three t4 statements are exercised
 * end to end and so each tamper has something honest to break.
 */
async function testVector(): Promise<RoundReceipt> {
  const rubric: Rubric = {
    name: "test-vector-r1",
    criteria: [
      { id: "land", weight: 3 },
      { id: "plan", weight: 2 },
    ],
  };
  const scenarioSet = { scenarios: ["irrigated", "dryland"] };
  const saltR = "test-vector-salt-r";
  const commitment = await rubricCommitment(rubric, scenarioSet, saltR);

  const applications = [
    { salt: "salt-a", digest: { id: "A" }, scores: { land: 10, plan: 5 } },
    { salt: "salt-b", digest: { id: "B" }, scores: { land: 8, plan: 9 } },
    { salt: "salt-c", digest: { id: "C" }, scores: { land: 9, plan: 6 } },
  ];
  const leaves: string[] = [];
  for (const application of applications) {
    leaves.push(
      await leafHash(
        applicationPayload(application.salt, application.digest),
      ),
    );
  }
  const root = await merkleRoot(
    applications.map((application) =>
      applicationPayload(application.salt, application.digest),
    ),
  );
  const scores: ScoreSet[] = applications.map((application, index) => ({
    leaf: leaves[index],
    scores: application.scores,
  }));
  const verdict = adjudicate(rubric, scores);
  const totals: Record<string, number> = {};
  for (const row of verdict) totals[row.leaf] = row.total;

  return {
    version: 1,
    round: "test-vector-1",
    commitment,
    root,
    size: applications.length,
    application: {
      salt: applications[0].salt,
      digest: applications[0].digest,
      path: await inclusionPath(
        applications.map((application) =>
          applicationPayload(application.salt, application.digest),
        ),
        0,
      ),
    },
    release: {
      rubric,
      scenarioSet,
      saltR,
      scores,
      order: verdict.map((row) => row.leaf),
      totals,
    },
  };
}

test("a generated test vector passes all three statements", async () => {
  const receipt = await testVector();
  const result = await verifyReceipt(receipt);
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.statements.map((s) => s.ok),
    [true, true, true],
  );
  assert.equal(result.facts.derivedCommitment, receipt.commitment);
  assert.equal(result.verdict.length, 3);
  assert.equal(result.verdict[0].rank, 0);
});

test("the leaf the payload hashes to is the applicant's leaf", async () => {
  const receipt = await testVector();
  const result = await verifyReceipt(receipt);
  assert.equal(result.facts.leaf, receipt.release.scores[0].leaf);
  // The chosen application is the third-ranked one; its leaf appears in the
  // derived verdict under exactly one rank.
  const matches = result.verdict.filter((row) => row.leaf === result.facts.leaf);
  assert.equal(matches.length, 1);
});

test("a changed published total fails the tally with total-mismatch", async () => {
  const receipt = await testVector();
  const leaf = receipt.release.order[1];
  receipt.release.totals[leaf] += 1;
  const result = await verifyReceipt(receipt);
  assert.equal(result.ok, false);
  const tally = result.statements[2];
  assert.equal(tally.ok, false);
  assert.equal(tally.reason, "total-mismatch");
});

test("a reordered ranking fails with order-mismatch", async () => {
  const receipt = await testVector();
  receipt.release.order.reverse();
  const result = await verifyReceipt(receipt);
  assert.equal(result.ok, false);
  assert.equal(result.statements[2].ok, false);
  assert.equal(result.statements[2].reason, "order-mismatch");
});

test("a changed score changes the verdict and is caught", async () => {
  const receipt = await testVector();
  receipt.release.scores[2].scores.land = 99;
  const result = await verifyReceipt(receipt);
  assert.equal(result.ok, false);
  assert.equal(result.statements[2].ok, false);
  assert.ok(
    result.statements[2].reason === "order-mismatch" ||
      result.statements[2].reason === "total-mismatch",
  );
});

test("a missing score is a named failure, never a silent zero", async () => {
  const receipt = await testVector();
  delete (receipt.release.scores[1].scores as Record<string, number>).plan;
  const result = await verifyReceipt(receipt);
  assert.equal(result.ok, false);
  assert.equal(result.statements[2].ok, false);
  assert.equal(result.statements[2].reason, "scores-incomplete");
});

test("a changed commitment fails the first statement", async () => {
  const receipt = await testVector();
  receipt.commitment = "0".repeat(64);
  const result = await verifyReceipt(receipt);
  assert.equal(result.ok, false);
  assert.equal(result.statements[0].ok, false);
  assert.equal(result.statements[0].reason, "rubric-inputs-mismatch");
  // The other statements are unaffected by a commitment change.
  assert.equal(result.statements[1].ok, true);
  assert.equal(result.statements[2].ok, true);
});

test("a foreign root fails inclusion as leaf-not-in-round", async () => {
  const receipt = await testVector();
  receipt.root = "f".repeat(64);
  const result = await verifyReceipt(receipt);
  assert.equal(result.ok, false);
  assert.equal(result.statements[1].ok, false);
  assert.equal(result.statements[1].reason, "leaf-not-in-round");
});

test("a truncated path fails by its pinned length", async () => {
  const receipt = await testVector();
  receipt.application.path = receipt.application.path.slice(1);
  const result = await verifyReceipt(receipt);
  assert.equal(result.ok, false);
  assert.equal(result.statements[1].ok, false);
  assert.equal(result.statements[1].reason, "path-wrong-length");
});

test("a receipt round-trips through text", async () => {
  const receipt = await testVector();
  const parsed = parseReceiptText(JSON.stringify(receipt));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const result = await verifyReceipt(parsed.receipt);
  assert.equal(result.ok, true);
});

test("unreadable text and shapes are refused with a message, not a crash", () => {
  const notJson = parseReceiptText("not json at all");
  assert.equal(notJson.ok, false);
  assert.match(notJson.ok ? "" : notJson.message, /not JSON/);

  const wrongVersion = parseReceipt({ version: 2 });
  assert.equal(wrongVersion.ok, false);
  assert.match(wrongVersion.ok ? "" : wrongVersion.message, /version/);

  const noPath = parseReceipt({
    version: 1,
    round: "r",
    commitment: "a".repeat(64),
    root: "b".repeat(64),
    size: 3,
    application: { salt: "s", digest: {}, path: [{ position: "sideways" }] },
    release: {},
  });
  assert.equal(noPath.ok, false);
  assert.match(noPath.ok ? "" : noPath.message, /application/);

  const noRelease = parseReceipt({
    version: 1,
    round: "r",
    commitment: "a".repeat(64),
    root: "b".repeat(64),
    size: 3,
    application: { salt: "s", digest: {}, path: [] },
  });
  assert.equal(noRelease.ok, false);
});
