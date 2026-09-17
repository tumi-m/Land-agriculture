import assert from "node:assert/strict";
import { test } from "node:test";
import {
  consistencyPath,
  inclusionPath,
  leafHash,
  merkleRoot,
  nodeHash,
  verifyConsistency,
  verifyInclusion,
} from "../src/lib/adjudication/merkle";
import { utf8 } from "../src/lib/adjudication/hash";

const payloads = (n: number) =>
  [...Array(n).keys()].map((i) => utf8(String(i)));

/**
 * The published Merkle vectors for the scheme (same run that produced the
 * hashing vectors in adjudication-hash.test.ts). Leaves are the payload bytes
 * "0", "1", ... in index order.
 */
const ROOT_VECTORS = {
  1: "061d913a7d8d7ae61f71c9bd57b4dcd339ffd366fce903e9fd80aa23230b8a67",
  2: "5d2679566b4eb57185b2f5833b5d4cbe706750c2d1ac9e23ff469a5bc6563b4e",
  3: "a6d59641aff49c94d7d7db40c613237f76eba0a0aaa5bb6668a254e3aba908ff",
  4: "ff58cad1604127a64bd019615427da08a7414902bd5c738080590a6082798d62",
  5: "1aa7999553b8ab3eb70e2dda8552e1ec775d23204bd9c07a818c0b5d0080e116",
  8: "51f6aef73249a8e1b0fd55d0838d6995f198928928f09361cf53f27c9f0858e9",
} as const;

test("the empty tree root is sha256 of nothing", async () => {
  assert.equal(
    await merkleRoot([]),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
});

test("roots match the published vectors", async () => {
  for (const [count, expected] of Object.entries(ROOT_VECTORS)) {
    assert.equal(await merkleRoot(payloads(Number(count))), expected, `MTH(${count})`);
  }
});

test("a leaf digest differs from a node digest over the same bytes", async () => {
  const leaf = await leafHash(utf8("0"));
  const node = await nodeHash(leaf, leaf);
  assert.notEqual(leaf, node);
});

test("a valid inclusion path verifies", async () => {
  const leaves = payloads(8);
  const root = await merkleRoot(leaves);
  for (const index of [0, 3, 7]) {
    const path = await inclusionPath(leaves, index);
    const verdict = await verifyInclusion(leaves[index], path, root, leaves.length);
    assert.equal(verdict.ok, true, `leaf ${index} must verify`);
  }
});

test("an altered leaf fails with the shared root-mismatch reason", async () => {
  const leaves = payloads(8);
  const root = await merkleRoot(leaves);
  const path = await inclusionPath(leaves, 3);
  const verdict = await verifyInclusion(utf8("tampered"), path, root, leaves.length);
  assert.deepEqual(verdict, { ok: false, reason: "root-mismatch" });
});

test("an altered path step fails with the shared root-mismatch reason", async () => {
  const leaves = payloads(8);
  const root = await merkleRoot(leaves);
  const [first, ...rest] = await inclusionPath(leaves, 3);
  const tampered = [
    { ...first, digest: first.digest.replace(/^../, "ff") },
    ...rest,
  ];
  const verdict = await verifyInclusion(leaves[3], tampered, root, leaves.length);
  assert.deepEqual(verdict, { ok: false, reason: "root-mismatch" });
});

test("a path walked against the wrong root fails", async () => {
  const leaves = payloads(8);
  const wrongRoot = await merkleRoot(payloads(5));
  const path = await inclusionPath(leaves, 3);
  const verdict = await verifyInclusion(leaves[3], path, wrongRoot, leaves.length);
  assert.deepEqual(verdict, { ok: false, reason: "root-mismatch" });
});

test("a receipt from the wrong round fails (leaf mix-up is root-mismatch)", async () => {
  const big = payloads(8);
  const small = payloads(5);
  const pathFromSmall = await inclusionPath(small, 3);
  const verdict = await verifyInclusion(small[3], pathFromSmall, await merkleRoot(big), big.length);
  assert.equal(verdict.ok, false);
});

test("path length is pinned by the published tree size", async () => {
  const leaves = payloads(8);
  const root = await merkleRoot(leaves);
  const path = await inclusionPath(leaves, 3);
  const short = await verifyInclusion(leaves[3], path.slice(1), root, 8);
  assert.deepEqual(short, { ok: false, reason: "path-length-mismatch" });
  const wrongRoot64 = "0".repeat(64);
  const noDigest = await verifyInclusion(leaves[3], path, "zzz", 8);
  assert.equal(noDigest.reason, "root-not-a-digest");
  const padded = await verifyInclusion(leaves[3], [...path, path[0]], root, 8);
  assert.deepEqual(padded, { ok: false, reason: "path-length-mismatch" });
  void wrongRoot64;
});

test("out-of-range leaf indexes are refused", async () => {
  const leaves = payloads(4);
  await assert.rejects(inclusionPath(leaves, 4), RangeError);
  await assert.rejects(inclusionPath(leaves, -1), RangeError);
  await assert.rejects(inclusionPath(leaves, 1.5), RangeError);
  await assert.rejects(inclusionPath([], 0), RangeError);
});

test("a log grown one entry at a time verifies at every step", async () => {
  // The QC5 seam: each published head must carry the previous one forward,
  // across every split shape up to 32 leaves (past the third power of two).
  const full = payloads(32);
  const roots: string[] = [];
  for (let n = 1; n <= full.length; n += 1) {
    roots.push(await merkleRoot(full.slice(0, n)));
  }
  for (let m = 1; m <= full.length; m += 1) {
    for (let n = m; n <= full.length; n += 1) {
      const proof = await consistencyPath(full.slice(0, n), m);
      const verdict = await verifyConsistency(m, n, roots[m - 1], roots[n - 1], proof);
      assert.equal(verdict.ok, true, `${m} → ${n} must verify: ${verdict.reason ?? ""}`);
    }
  }
});

test("a consistency proof tampered at any position is rejected", async () => {
  const full = payloads(8);
  const m = 3;
  const oldRoot = await merkleRoot(full.slice(0, m));
  const newRoot = await merkleRoot(full);
  const proof = await consistencyPath(full, m);
  for (let i = 0; i < proof.length; i += 1) {
    const tampered = proof.map((d, j) => (j === i ? d.replace(/^../, "ff") : d));
    const verdict = await verifyConsistency(m, 8, oldRoot, newRoot, tampered);
    assert.equal(verdict.ok, false, `tampering node ${i} must fail`);
  }
});

test("a truncated or padded consistency proof is refused by size", async () => {
  const full = payloads(8);
  const m = 3;
  const oldRoot = await merkleRoot(full.slice(0, m));
  const newRoot = await merkleRoot(full);
  const proof = await consistencyPath(full, m);
  const short = await verifyConsistency(m, 8, oldRoot, newRoot, proof.slice(1));
  assert.equal(short.ok, false);
  const long = await verifyConsistency(m, 8, oldRoot, newRoot, [...proof, proof[0]]);
  assert.equal(long.ok, false);
});

test("an append-only log's consistency proof verifies across the seam", async () => {
  // Grow the log from 3 to 8 entries; the m=3 head must carry forward.
  const full = payloads(8);
  const m = 3;
  const small = full.slice(0, m);
  const oldRoot = await merkleRoot(small);
  const newRoot = await merkleRoot(full);
  const proof = await consistencyPath(full, m);
  assert.ok(proof.length > 0, "a growing tree produces a proof");
  const verdict = await verifyConsistency(m, 8, oldRoot, newRoot, proof);
  assert.equal(verdict.ok, true, `m=${m} → n=8 must verify: ${verdict.reason ?? ""}`);
});

test("an unchanged tree has an empty proof and verifies", async () => {
  const leaves = payloads(5);
  const root = await merkleRoot(leaves);
  const proof = await consistencyPath(leaves, 5);
  assert.deepEqual(proof, []);
  assert.deepEqual(await verifyConsistency(5, 5, root, root, proof), { ok: true });
});

test("a tampered consistency proof is rejected", async () => {
  const full = payloads(8);
  const m = 3;
  const oldRoot = await merkleRoot(full.slice(0, m));
  const newRoot = await merkleRoot(full);
  const proof = await consistencyPath(full, m);
  const verdict = await verifyConsistency(m, 8, oldRoot, newRoot, [
    proof[0].replace(/^../, "ff"),
    ...proof.slice(1),
  ]);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason ?? "", /mismatch/);
});

test("a proof against the wrong published head is rejected", async () => {
  const full = payloads(8);
  const proof = await consistencyPath(full, 3);
  const wrongOld = await merkleRoot(payloads(2));
  const newRoot = await merkleRoot(full);
  const verdict = await verifyConsistency(3, 8, wrongOld, newRoot, proof);
  assert.deepEqual(verdict, { ok: false, reason: "old-root-mismatch" });
});

test("the same leaf list always produces the same root", async () => {
  assert.equal(await merkleRoot(payloads(5)), await merkleRoot(payloads(5)));
});
