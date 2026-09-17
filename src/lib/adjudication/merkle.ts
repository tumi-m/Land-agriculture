/**
 * The Merkle tree over a published adjudication round (docs/inventions/01).
 * The shape is Certificate Transparency's (RFC 6962 §2.1), with this scheme's
 * domain prefix in `hash.ts` separating leaves from internal nodes:
 *
 *   MTH({})    = SHA-256("")
 *   MTH({d})   = SHA-256(DOMAIN ‖ "/leaf/" ‖ d ‖ "/")        over one payload
 *   MTH(range) = SHA-256(DOMAIN ‖ "/node/" ‖ left ‖ right)   over two digests
 *
 * The split is the largest power of two strictly below the node count, so the
 * left subtree is always complete and the tree shape depends only on how many
 * leaves there are — two engines that agree on the leaf list agree on the
 * root.
 *
 * Leaves arrive here as raw payload bytes; the salting that turns an
 * application into a leaf happens in `rubric.ts`, above this module's layer.
 */
import { DOMAIN_HASH, hashParts, hexToBytes, sha256Hex, utf8 } from "./hash";

/** A hex digest, always lower-case, 64 characters. */
export type Digest = string;

export async function leafHash(payload: Uint8Array): Promise<Digest> {
  return hashParts([DOMAIN_HASH, utf8("/leaf/"), payload, utf8("/")]);
}

export async function nodeHash(left: Digest, right: Digest): Promise<Digest> {
  return hashParts([
    DOMAIN_HASH,
    utf8("/node/"),
    hexToBytes(left),
    hexToBytes(right),
  ]);
}

/** Largest power of two strictly below n. Only called with n >= 2. */
function largestSplit(n: number): number {
  let k = 1;
  while (2 * k < n) k *= 2;
  return k;
}

/** Root of the tree over a span of the leaf list. */
async function spanRoot(leaves: Uint8Array[], lo: number, hi: number): Promise<Digest> {
  if (hi - lo === 1) return leafHash(leaves[lo]);
  const k = largestSplit(hi - lo);
  return nodeHash(
    await spanRoot(leaves, lo, lo + k),
    await spanRoot(leaves, lo + k, hi),
  );
}

/** The root of the Merkle tree over these payload bytes. */
export async function merkleRoot(leaves: Uint8Array[]): Promise<Digest> {
  if (leaves.length === 0) return sha256Hex(new Uint8Array(0));
  return spanRoot(leaves, 0, leaves.length);
}

/** One step of an inclusion path: which side the sibling sits on. */
export interface MerkleStep {
  position: "left" | "right";
  digest: Digest;
}

/**
 * The inclusion path for the leaf at `index`: the sibling digest at every
 * subtree on the way up, ordered leaf-first.
 */
export async function inclusionPath(
  leaves: Uint8Array[],
  index: number,
): Promise<MerkleStep[]> {
  if (!Number.isInteger(index) || index < 0 || index >= leaves.length) {
    throw new RangeError(
      `leaf index ${index} is outside a ${leaves.length}-leaf tree`,
    );
  }
  const path: MerkleStep[] = [];

  async function walk(lo: number, hi: number): Promise<Digest> {
    if (hi - lo === 1) return leafHash(leaves[lo]);
    const k = largestSplit(hi - lo);
    if (index < lo + k) {
      const own = await walk(lo, lo + k);
      path.push({ position: "right", digest: await spanRoot(leaves, lo + k, hi) });
      return own;
    }
    const own = await walk(lo + k, hi);
    path.push({ position: "left", digest: await spanRoot(leaves, lo, lo + k) });
    return own;
  }

  await walk(0, leaves.length);
  return path;
}

export type InclusionFailure =
  | "root-not-a-digest"
  | "path-length-mismatch"
  | "root-mismatch";

export interface InclusionVerification {
  ok: boolean;
  /** When ok is false, a fixed phrase: an altered leaf, an altered path and a
   *  wrong published root all surface as `root-mismatch`, because the holder
   *  cannot tell which one moved. */
  reason?: InclusionFailure;
}

/**
 * Walk a receipt's path against a payload and a claimed root. `treeSize` is
 * the published size of the round, so a truncated or padded path fails before
 * any hashing.
 */
export async function verifyInclusion(
  payload: Uint8Array,
  path: MerkleStep[],
  root: string,
  treeSize: number,
): Promise<InclusionVerification> {
  if (!/^[0-9a-f]{64}$/.test(root)) {
    return { ok: false, reason: "root-not-a-digest" };
  }
  const expected = treeSize <= 1 ? 0 : Math.ceil(Math.log2(treeSize));
  if (path.length !== expected) {
    return { ok: false, reason: "path-length-mismatch" };
  }
  let running = await leafHash(payload);
  for (const step of path) {
    running =
      step.position === "left"
        ? await nodeHash(step.digest, running)
        : await nodeHash(running, step.digest);
  }
  return running === root ? { ok: true } : { ok: false, reason: "root-mismatch" };
}

/**
 * The consistency proof between sizes m and n of one append-only log: the
 * subtree digests whose concatenation is [0, m) within D_n, followed by the
 * digests whose concatenation is [m, n) (RFC 6962 §2.1.2's SUBPROOF chain,
 * collected at the top level). `leaves` is the full n-leaf log.
 */
export async function consistencyPath(
  leaves: Uint8Array[],
  m: number,
): Promise<Digest[]> {
  const n = leaves.length;
  if (!Number.isInteger(m) || m < 1 || m > n) {
    throw new RangeError(
      `consistency endpoint ${m} is outside a ${n}-leaf tree`,
    );
  }
  return subproof(leaves, m, true);
}

/** RFC 6962 §2.1.2 SUBPROOF over D_n = leaves[0..n), with b marking whether
 *  the m-head is complete. */
async function subproof(
  leaves: Uint8Array[],
  m: number,
  b: boolean,
): Promise<Digest[]> {
  const n = leaves.length;
  if (m === n) return b ? [] : [await merkleRoot(leaves)];
  const k = largestSplit(n);
  if (m <= k) {
    const inner = await subproof(leaves.slice(0, k), m, b);
    return [...inner, await merkleRoot(leaves.slice(k, n))];
  }
  const inner = await subproof(leaves.slice(k, n), m - k, false);
  return [await merkleRoot(leaves.slice(0, k)), ...inner];
}

export type ConsistencyFailure =
  | "proof-empty"
  | "proof-wrong-size"
  | "root-not-a-digest"
  | "old-root-mismatch"
  | "new-root-mismatch";

export interface ConsistencyVerification {
  ok: boolean;
  reason?: ConsistencyFailure;
}

// --- Consistency verification ---------------------------------------------
// RFC 6962 §2.1.2, mirroring the generator's SUBPROOF chain step for step.
// The verifier walks the same recursion as `subproof` above: at each level
// the largest-power-of-two split decides whether the m-fold descends left
// (and the completed right root is consumed) or right (and the completed
// left root is consumed). A proof node is only used if the recursion ends by
// exhausting the proof at the exact moment both folds are complete; any fold
// that disagrees fails with a named reason.

/** What one span of the SUBPROOF recursion attests: the fold over the part
 *  of [0, oldSize) inside this span, the fold over the whole span, and how
 *  many leading proof digests were consumed. */
interface FoldWalk {
  oldFold: Digest;
  newFold: Digest;
  /** How many leading digests of the proof this span consumed. */
  used: number;
}

async function walkConsistency(
  m: number,
  lo: number,
  hi: number,
  proof: Digest[],
  oldRoot: Digest,
  complete: boolean,
): Promise<FoldWalk> {
  const n = hi - lo;
  const rel = m - lo;
  if (rel === n) {
    // m-complete span. When the generator saw b === true it emitted nothing
    // and the trusted root is both folds; when b was false it emitted that
    // span's root as a single proof node, which becomes the old fold.
    if (complete) {
      // This span consumes nothing; leftover nodes belong to enclosing
      // spans' siblings (the final length check happens on the top-level
      // walk's return).
      return { oldFold: oldRoot, newFold: oldRoot, used: 0 };
    }
    if (proof.length === 0) throw new RangeError("proof ended early");
    return { oldFold: proof[0], newFold: proof[0], used: 1 };
  }
  const k = largestSplit(n);
  if (rel <= k) {
    // [SUBPROOF(left, m, b), MTH(right)]: the inner walk consumes a prefix,
    // then the right subtree's root is one node. The old fold stays inside
    // the left subtree; the right root joins only the new fold.
    const inner = await walkConsistency(m, lo, lo + k, proof, oldRoot, complete);
    if (inner.used >= proof.length) throw new RangeError("proof ended early");
    const right = proof[inner.used];
    return {
      oldFold: inner.oldFold,
      newFold: await nodeHash(inner.newFold, right),
      used: inner.used + 1,
    };
  }
  // [MTH(D_k), SUBPROOF(right, m - k, false)]: the left subtree's root is
  // one node and the rest recurses right with b === false. The left subtree
  // sits wholly inside [0, m), so its root joins BOTH folds.
  if (proof.length === 0) throw new RangeError("proof ended early");
  const left = proof[0];
  const inner = await walkConsistency(m, lo + k, hi, proof.slice(1), oldRoot, false);
  return {
    oldFold: await nodeHash(left, inner.oldFold),
    newFold: await nodeHash(left, inner.newFold),
    used: inner.used + 1,
  };
}

/**
 * Recompute the two heads a consistency proof attests — the fold over the
 * first `oldSize` leaves and the fold over the full `newSize`-leaf tree —
 * then require them to match the published roots, old first: a proof built
 * against a rewritten history disagrees in the old fold before the new root
 * is even considered.
 */
export async function verifyConsistency(
  oldSize: number,
  newSize: number,
  oldRoot: Digest,
  newRoot: Digest,
  proof: Digest[],
): Promise<ConsistencyVerification> {
  if (
    !Number.isInteger(oldSize) ||
    !Number.isInteger(newSize) ||
    oldSize < 1 ||
    oldSize > newSize
  ) {
    throw new RangeError(`tree sizes ${oldSize} → ${newSize} are not a chain`);
  }
  if (!/^[0-9a-f]{64}$/.test(oldRoot) || !/^[0-9a-f]{64}$/.test(newRoot)) {
    return { ok: false, reason: "root-not-a-digest" };
  }
  if (oldSize === newSize) {
    if (proof.length !== 0) return { ok: false, reason: "proof-wrong-size" };
    return oldRoot === newRoot
      ? { ok: true }
      : { ok: false, reason: "old-root-mismatch" };
  }
  if (proof.length === 0) return { ok: false, reason: "proof-empty" };
  try {
    const walk = await walkConsistency(oldSize, 0, newSize, proof, oldRoot, true);
    if (walk.used !== proof.length) {
      return { ok: false, reason: "proof-wrong-size" };
    }
    if (walk.oldFold !== oldRoot) {
      return { ok: false, reason: "old-root-mismatch" };
    }
    return walk.newFold === newRoot
      ? { ok: true }
      : { ok: false, reason: "new-root-mismatch" };
  } catch {
    return { ok: false, reason: "proof-wrong-size" };
  }
}
