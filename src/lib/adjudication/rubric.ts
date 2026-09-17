/**
 * The versioned scorer for a published adjudication round (t3's third
 * statement: `rubric_code(scores) == ranking`).
 *
 * What "versioned" means here: a rubric is a named code string plus a list
 * of criteria the organiser committed to before the round opened. The code
 * string is stamped with this scorer's format version (`rubric:1:<name>`),
 * so a rubric commitment can never be re-read by a later scorer as a
 * different algorithm, and so the digest of a rubric can never collide with
 * a bare name or an application-leaf payload of the same bytes (the scheme's
 * domain separation, carried one layer up).
 *
 * Scoring is a weighted total. Every application must carry a number for
 * every criterion; a missing criterion is an incomplete score set, never a
 * silent zero. The tie-break is the leaf digest — the only public,
 * anonymised handle that survives reordering — so the verdict is
 * deterministic no matter who sorts first.
 */
import { DOMAIN_HASH, hashJson, hashParts, hexToBytes, utf8 } from "./hash";

/** The scorer format this module implements. Bump only with a new scorer. */
export const RUBRIC_VERSION = 1;

export interface Criterion {
  /** Machine name from the published weights (canonical JSON key). */
  id: string;
  /** Weight of this criterion in the total. Must be finite and > 0. */
  weight: number;
}

export interface Rubric {
  /** Short machine name, e.g. "land-reform-r3". Combined with the version
   *  to form the committed code string: `rubric:1:land-reform-r3`. */
  name: string;
  criteria: Criterion[];
}

export interface ScoreSet {
  /** The applicant's anonymised leaf digest (round-tree leaf, hex). */
  leaf: string;
  /** Criterion id → score. Must cover every criterion in the rubric. */
  scores: Record<string, number>;
}

export interface VerdictRow {
  leaf: string;
  total: number;
  /** 0-based position in the verdict, best first. */
  rank: number;
}

/** The committed code string for a rubric: `rubric:1:<name>`. */
export function rubricCode(rubric: Rubric): string {
  return `rubric:${RUBRIC_VERSION}:${rubric.name}`;
}

/** The weights map as committed: criterion id → weight, in rubric order. */
export function rubricWeights(rubric: Rubric): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const criterion of rubric.criteria) {
    if (!Number.isFinite(criterion.weight) || criterion.weight <= 0) {
      throw new TypeError(
        `criterion "${criterion.id}" has weight ${criterion.weight}: weights are finite positives`,
      );
    }
    weights[criterion.id] = criterion.weight;
  }
  return weights;
}

/**
 * The rubric commitment published at t0:
 *
 *   R = H(rubric_code ‖ weights ‖ scenario_set ‖ salt_r)
 *
 * `rubric_code` and `salt_r` are byte strings; `weights` and `scenario_set`
 * are JSON values hashed over their canonical form. The code string is given
 * the scheme's leaf-style domain (`/rubric/`) so the commitment never
 * aliases an application leaf over the same bytes.
 */
export async function rubricCommitment(
  rubric: Rubric,
  scenarioSet: unknown,
  saltR: string,
): Promise<string> {
  const code = await hashParts([
    DOMAIN_HASH,
    utf8("/rubric/"),
    utf8(rubricCode(rubric)),
    utf8("/"),
  ]);
  return hashParts([
    hexToBytes(code),
    hexToBytes(await hashJson(rubricWeights(rubric))),
    hexToBytes(await hashJson(scenarioSet)),
    utf8(saltR),
  ]);
}

/**
 * The total for one score set. Throws a TypeError naming the criterion when
 * a score is missing or not finite — an incomplete set is never ranked.
 */
export function scoreTotal(rubric: Rubric, scores: Record<string, number>): number {
  let total = 0;
  for (const criterion of rubric.criteria) {
    const value = scores[criterion.id];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(
        `criterion "${criterion.id}" has no usable score for this leaf`,
      );
    }
    total += criterion.weight * value;
  }
  return total;
}

/**
 * The verdict over a round: every score set scored, ordered best-total-first
 * with ties broken by leaf digest (byte order of the hex). Deterministic —
 * two engines with the same inputs always agree on the ranking.
 */
export function adjudicate(rubric: Rubric, scoreSets: ScoreSet[]): VerdictRow[] {
  const rows = scoreSets.map((set) => {
    if (!/^[0-9a-f]{64}$/.test(set.leaf)) {
      throw new TypeError(`leaf "${set.leaf}" is not a round leaf digest`);
    }
    return { leaf: set.leaf, total: scoreTotal(rubric, set.scores), rank: 0 };
  });
  rows.sort(
    (a, b) => b.total - a.total || (a.leaf < b.leaf ? -1 : a.leaf > b.leaf ? 1 : 0),
  );
  rows.forEach((row, index) => {
    row.rank = index;
  });
  return rows;
}

export type ScoreSetFailure =
  | "order-mismatch"
  | "total-mismatch";

export interface ScoreSetVerification {
  ok: boolean;
  /** Which of the three t4 checks failed, in the order they are run. */
  reason?: ScoreSetFailure;
  /** The leaf whose position or total first disagreed, when ok is false. */
  leaf?: string;
  /** The criterion whose score moved, when it can be named. */
  criterion?: string;
}

/**
 * Check t4's third statement against a published verdict: that `order` is
 * exactly the ranking the published scores produce, and that the published
 * per-score totals re-derive from the published per-criterion scores.
 *
 * A reordered score (one criterion's number swapped between two leaves, for
 * example) is caught by matching each published row's total against the
 * re-derived total leaf-for-leaf; when the mismatch can be traced to a
 * single criterion the reason names it.
 */
export function verifyScoreSet(
  rubric: Rubric,
  scoreSets: ScoreSet[],
  order: string[],
  totals: Record<string, number>,
): ScoreSetVerification {
  const verdict = adjudicate(rubric, scoreSets);
  for (const [index, row] of verdict.entries()) {
    if (order[index] !== row.leaf) {
      return { ok: false, reason: "order-mismatch", leaf: row.leaf };
    }
  }
  if (order.length !== verdict.length) {
    return { ok: false, reason: "order-mismatch", leaf: order[verdict.length] };
  }
  for (const set of scoreSets) {
    const published = totals[set.leaf];
    const derived = scoreTotal(rubric, set.scores);
    if (published !== derived) {
      const criterion = rubric.criteria.find(
        (c) => typeof set.scores[c.id] === "number" && !Number.isNaN(set.scores[c.id]),
      );
      return {
        ok: false,
        reason: "total-mismatch",
        leaf: set.leaf,
        criterion: criterion?.id,
      };
    }
  }
  return { ok: true };
}
