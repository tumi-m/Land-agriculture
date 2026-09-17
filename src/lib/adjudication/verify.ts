/**
 * The t4 verifier (docs/inventions/01): three statements anyone can run on a
 * published adjudication round, entirely in the browser — nothing leaves the
 * device. The statements are:
 *
 *   1. H(published rubric inputs) == R          the rubric was not retrofitted
 *   2. the inclusion path resolves to the root  the application was adjudicated
 *   3. rubric_code(scores) == ranking            the tally is correct
 *
 * The input is a receipt: the applicant's own leaf inputs and inclusion path,
 * plus the artefacts of the round that were published at t3 (rubric, weights,
 * scenario set, salt, scores, ranking, totals). The receipt is data, never
 * trusted: every value in it is re-derived where possible and compared.
 *
 * Honesty rules, carried from the record: a value that cannot be pinned is a
 * named failure, never a pass; "check unavailable" is distinct from "checked
 * and false"; and the page must say what this does not prove — the entry of a
 * score by a human is not proved by this scheme, and an unanchored receipt
 * only shows that its own numbers agree.
 */
import { canonicalize } from "./canonical";
import { utf8 } from "./hash";
import { leafHash, verifyInclusion, type MerkleStep } from "./merkle";
import {
  adjudicate,
  rubricCommitment,
  verifyScoreSet,
  type Rubric,
  type ScoreSet,
  type VerdictRow,
} from "./rubric";

/** The leaf payload for an application: salt_i ‖ digest(application_i), the
 *  bytes the round tree's `leafHash` then takes a domain-separated digest of. */
export function applicationPayload(
  salt: string,
  digest: unknown,
): Uint8Array {
  const parts = [utf8(salt), utf8(canonicalize(digest))];
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const all = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    all.set(part, offset);
    offset += part.byteLength;
  }
  return all;
}

/** A receipt as pasted by an applicant. Versioned, so a future round format
 *  is a new version rather than a re-read of this one. */
export interface RoundReceipt {
  version: 1;
  /** Round identifier, e.g. "northern-cape-2026-r1". */
  round: string;
  /** R, the rubric commitment published at t0 (64 hex). */
  commitment: string;
  /** The round tree's root at t2 (64 hex). */
  root: string;
  /** The number of application leaves in the round. */
  size: number;
  application: {
    /** The applicant's private salt. */
    salt: string;
    /** digest(application): any JSON value. */
    digest: unknown;
    /** The inclusion path from the applicant's leaf to the root. */
    path: MerkleStep[];
  };
  release: {
    /** The rubric whose inputs were committed to at t0. */
    rubric: Rubric;
    scenarioSet: unknown;
    /** The salt used in the commitment. */
    saltR: string;
    /** The published per-criterion scores, one set per leaf. */
    scores: ScoreSet[];
    /** The published ranking: leaf digests, best first. */
    order: string[];
    /** The published per-leaf totals. */
    totals: Record<string, number>;
  };
}

export type StatementId = "commitment" | "inclusion" | "tally";

export interface StatementResult {
  id: StatementId;
  /** Plain-English name of the statement. */
  title: string;
  ok: boolean;
  /** Fixed machine phrase when ok is false. */
  reason?: string;
  /** One sentence a person can act on. */
  detail: string;
}

/** The numbers behind a receipt, as shown next to the verdicts. */
export interface ReceiptFacts {
  round: string;
  commitment: string;
  derivedCommitment: string;
  root: string;
  size: number;
  /** The leaf the receipt's payload hashes to. */
  leaf: string;
  /** The applicant's path length, pinned by size. */
  pathLength: number;
}

export interface ReceiptVerification {
  ok: boolean;
  facts: ReceiptFacts;
  statements: StatementResult[];
  /** The ranking re-derived from the published scores, best first. */
  verdict: VerdictRow[];
  /** The published totals, for the screen-reader table. */
  publishedTotals: Record<string, number>;
}

export type ReceiptParse =
  | { ok: true; receipt: RoundReceipt }
  | { ok: false; message: string };

function isHex64(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function isMerkleStep(value: unknown): value is MerkleStep {
  if (value === null || typeof value !== "object") return false;
  const step = value as Record<string, unknown>;
  return (
    (step.position === "left" || step.position === "right") &&
    isHex64(step.digest)
  );
}

function isRubric(value: unknown): value is Rubric {
  if (value === null || typeof value !== "object") return false;
  const rubric = value as Record<string, unknown>;
  if (typeof rubric.name !== "string" || rubric.name === "") return false;
  if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
    return false;
  }
  return rubric.criteria.every((criterion: unknown) => {
    if (criterion === null || typeof criterion !== "object") return false;
    const c = criterion as Record<string, unknown>;
    return typeof c.id === "string" && typeof c.weight === "number";
  });
}

function isScoreSet(value: unknown): value is ScoreSet {
  if (value === null || typeof value !== "object") return false;
  const set = value as Record<string, unknown>;
  if (!isHex64(set.leaf)) return false;
  if (set.scores === null || typeof set.scores !== "object") return false;
  return Object.values(set.scores as Record<string, unknown>).every(
    (score) => typeof score === "number",
  );
}

/** Read a receipt from parsed JSON. Only the shape needed to run the
 *  statements safely is enforced here; a value that is well-shaped but
 *  wrong lands as a named statement failure, not a crash. */
export function parseReceipt(value: unknown): ReceiptParse {
  if (value === null || typeof value !== "object") {
    return { ok: false, message: "That is not a receipt: it is not an object." };
  }
  const receipt = value as Record<string, unknown>;
  if (receipt.version !== 1) {
    return {
      ok: false,
      message:
        "That receipt is a version this page does not know. Check it with the page that issued it.",
    };
  }
  if (typeof receipt.round !== "string" || !isHex64(receipt.commitment)) {
    return { ok: false, message: "That receipt has no round or commitment to check." };
  }
  if (!isHex64(receipt.root)) {
    return { ok: false, message: "That receipt has no round root to check against." };
  }
  if (
    typeof receipt.size !== "number" ||
    !Number.isInteger(receipt.size) ||
    receipt.size < 1
  ) {
    return { ok: false, message: "That receipt does not say how many leaves the round had." };
  }
  const application = receipt.application as Record<string, unknown> | undefined;
  if (
    application === undefined ||
    typeof application.salt !== "string" ||
    !("digest" in application) ||
    !Array.isArray(application.path) ||
    !application.path.every(isMerkleStep)
  ) {
    return { ok: false, message: "That receipt has no readable application or inclusion path." };
  }
  const release = receipt.release as Record<string, unknown> | undefined;
  if (
    release === undefined ||
    !isRubric(release.rubric) ||
    !("scenarioSet" in release) ||
    typeof release.saltR !== "string" ||
    !Array.isArray(release.scores) ||
    !release.scores.every(isScoreSet) ||
    !Array.isArray(release.order) ||
    !release.order.every(isHex64) ||
    release.totals === null ||
    typeof release.totals !== "object"
  ) {
    return { ok: false, message: "That receipt has no readable published release to check." };
  }
  return { ok: true, receipt: value as unknown as RoundReceipt };
}

/** Read a receipt from pasted text. */
export function parseReceiptText(text: string): ReceiptParse {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return {
      ok: false,
      message: "That is not JSON. Paste the receipt exactly as you received it.",
    };
  }
  return parseReceipt(value);
}

const STATEMENT_TITLES: Record<StatementId, string> = {
  commitment: "The rubric was not changed after commitment",
  inclusion: "Your application was in the adjudicated set",
  tally: "The ranking re-derives from the published scores",
};

function pass(id: StatementId, detail: string): StatementResult {
  return { id, title: STATEMENT_TITLES[id], ok: true, detail };
}

function failed(id: StatementId, reason: string, detail: string): StatementResult {
  return { id, title: STATEMENT_TITLES[id], ok: false, reason, detail };
}

/**
 * Run the three statements over a receipt. Pure and client-side: no network,
 * no globals beyond WebCrypto (SHA-256).
 */
export async function verifyReceipt(
  receipt: RoundReceipt,
): Promise<ReceiptVerification> {
  const statements: StatementResult[] = [];
  const facts: ReceiptFacts = {
    round: receipt.round,
    commitment: receipt.commitment,
    derivedCommitment: "",
    root: receipt.root,
    size: receipt.size,
    leaf: "",
    pathLength: receipt.application.path.length,
  };

  // Statement 1 — H(published rubric inputs) == R.
  try {
    facts.derivedCommitment = await rubricCommitment(
      receipt.release.rubric,
      receipt.release.scenarioSet,
      receipt.release.saltR,
    );
    statements.push(
      facts.derivedCommitment === receipt.commitment
        ? pass(
            "commitment",
            "The published rubric inputs hash to the committed R.",
          )
        : failed(
            "commitment",
            "rubric-inputs-mismatch",
            "The published rubric inputs do not hash to R. The rubric changed after it was committed, or this is not that round's receipt.",
          ),
    );
  } catch (error) {
    statements.push(
      failed(
        "commitment",
        "rubric-inputs-unreadable",
        `The rubric inputs cannot be read: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }

  // Statement 2 — the inclusion path resolves to the published root.
  try {
    const payload = applicationPayload(
      receipt.application.salt,
      receipt.application.digest,
    );
    facts.leaf = await leafHash(payload);
    const verdict = await verifyInclusion(
      payload,
      receipt.application.path,
      receipt.root,
      receipt.size,
    );
    if (verdict.ok) {
      statements.push(
        pass(
          "inclusion",
          "The receipt's path walks from your leaf to the published round root.",
        ),
      );
    } else if (verdict.reason === "path-length-mismatch") {
      statements.push(
        failed(
          "inclusion",
          "path-wrong-length",
          `This receipt's path is ${receipt.application.path.length} steps long; a ${receipt.size}-leaf round takes a path of a fixed, different length.`,
        ),
      );
    } else if (verdict.reason === "root-not-a-digest") {
      statements.push(
        failed(
          "inclusion",
          "round-root-unreadable",
          "The round root is not a digest, so the path cannot be walked.",
        ),
      );
    } else {
      statements.push(
        failed(
          "inclusion",
          "leaf-not-in-round",
          "The path does not fold to the published root. This application is not in the set that was adjudicated under that root.",
        ),
      );
    }
  } catch (error) {
    statements.push(
      failed(
        "inclusion",
        "leaf-unreadable",
        `The application's leaf inputs cannot be read: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }

  // Statement 3 — rubric_code(scores) == ranking.
  let verdict: VerdictRow[] = [];
  try {
    verdict = adjudicate(receipt.release.rubric, receipt.release.scores);
    const check = verifyScoreSet(
      receipt.release.rubric,
      receipt.release.scores,
      receipt.release.order,
      receipt.release.totals,
    );
    if (check.ok) {
      statements.push(
        pass(
          "tally",
          "The published ranking and the published per-leaf totals both re-derive from the published scores.",
        ),
      );
    } else if (check.reason === "total-mismatch") {
      const criterion =
        check.criterion === undefined ? "" : ` (first at criterion "${check.criterion}")`;
      statements.push(
        failed(
          "tally",
          "total-mismatch",
          `A published total does not match its own scores${criterion}. The scores were changed after the tally, or the tally is wrong.`,
        ),
      );
    } else {
      statements.push(
        failed(
          "tally",
          "order-mismatch",
          "The published ranking is not the order these scores produce. The ranking was changed after the scores were published, or the scores are not the ones that were tallied.",
        ),
      );
    }
  } catch (error) {
    statements.push(
      failed(
        "tally",
        "scores-incomplete",
        `The ranking cannot be re-derived: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }

  return {
    ok: statements.every((statement) => statement.ok),
    facts,
    statements,
    verdict,
    publishedTotals: receipt.release.totals,
  };
}
