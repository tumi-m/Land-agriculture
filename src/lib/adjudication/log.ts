/**
 * The append-only log over an adjudication round's published artefacts
 * (docs/inventions/01, the second Merkle structure). Its leaves are the
 * canonical bytes of every published artefact — the rubric commitment `R`
 * at advert open (t0), the round root at close (t2), the rubric release at
 * determination (t3) — and it emits a signed tree head so a client holding
 * only the organiser's public key can check the log is one history, not a
 * fork: every later head is consistent with every earlier one.
 *
 * The wire shape is `public/adjudication/log.json`: `{ version, entries,
 * heads }`. Until a real round is published it stays empty by design; an
 * empty log is a valid state, not an error (the record's rule: no sample
 * data, never).
 *
 * Leaf order is the log's truth. The Merkle structure over the leaves is the
 * round tree in `merkle.ts`; this module adds the entry typing, head shape
 * and the client-side audit that chains heads together.
 */
import { canonicalize } from "./canonical";
import { hashJson, utf8 } from "./hash";
import {
  consistencyPath,
  inclusionPath,
  merkleRoot,
  verifyConsistency,
  verifyInclusion,
} from "./merkle";
import {
  type Signature,
  type SigningPublicKey,
  verifyHeadSignature,
} from "./signature";

export const LOG_VERSION = 1 as const;

/** What kind of artefact a leaf publishes, and when it is published. */
export type ArtefactKind =
  | "rubric-commitment" // t0: R = H(rubric_code ‖ weights ‖ scenario_set ‖ salt_r)
  | "round-root" // t2: the Merkle root over that round's application leaves
  | "rubric-release"; // t3: rubric_code, weights, scenario_set, salt_r

export interface LogEntry {
  kind: ArtefactKind;
  /** ISO 8601 date, the artefact's publication date. */
  published: string;
  /** The artefact itself. Must be JSON (the canonical form is hashed). */
  artefact: unknown;
}

/** The signed tree head over the log at one point in its history. */
export interface TreeHead {
  /** Number of log entries the head covers. */
  size: number;
  /** Merkle root over those entries, 64 hex characters. */
  root: string;
  /** ISO 8601 timestamp of the head's publication. */
  published: string;
  /** Ed25519 signature over the canonical head, 128 hex characters. */
  signature: Signature;
}

/** The wire form `public/adjudication/log.json` takes. */
export interface AdjudicationLog {
  version: typeof LOG_VERSION;
  entries: LogEntry[];
  heads: TreeHead[];
}

/** The empty log, as it is served until a real round is published. The
 *  note is for a person reading the file; the app never invents entries. */
export const EMPTY_LOG_NOTE =
  "No adjudication round has been published yet. This file is the log's " +
  "home; the /verify page reads it and shows an empty state until a real " +
  "round is signed here. Sample entries are never added.";

/** The bytes of a log entry — the canonical JSON of the whole entry, since
 *  kind and publication date are part of what was attested. */
export function entryBytes(entry: LogEntry): Uint8Array {
  return utf8(canonicalize(entry));
}

/** The leaf digest a head's Merkle root is taken over, for `entryBytes`. */
export async function entryLeaf(entry: LogEntry): Promise<string> {
  return hashJson(entry);
}

/** The head over the first `size` entries of the log (unsigned). */
export async function headRoot(
  entries: LogEntry[],
  size?: number,
): Promise<string> {
  const upto = size === undefined ? entries.length : size;
  if (!Number.isInteger(upto) || upto < 0 || upto > entries.length) {
    throw new RangeError(`head size ${size} is outside the log`);
  }
  return merkleRoot(entries.slice(0, upto).map(entryBytes));
}

export type LogFailure =
  | "log-malformed"
  | "log-version-unsupported"
  | "head-signature-unavailable"
  | "head-signature-invalid"
  | "head-wrong-size"
  | "head-root-mismatch"
  | "entry-not-in-log"
  | "entry-not-covered"
  | "heads-not-consistent";

export interface LogVerification {
  ok: boolean;
  reason?: LogFailure;
  /** The message a person can act on, in plain English. */
  message?: string;
}

function fail(reason: LogFailure): LogVerification {
  return { ok: false, reason, message: FAILURE_MESSAGES[reason] };
}

const FAILURE_MESSAGES: Record<LogFailure, string> = {
  "log-malformed":
    "The adjudication log is not shaped as expected. It cannot be checked.",
  "log-version-unsupported":
    "The adjudication log is a newer format than this page knows. Update the page and check again.",
  "head-signature-unavailable":
    "The organiser's signature cannot be checked in this browser.",
  "head-signature-invalid":
    "A published head fails its signature. The log cannot be trusted as one history.",
  "head-wrong-size":
    "A head claims to cover more or fewer entries than the log holds. The log cannot be checked.",
  "head-root-mismatch":
    "The entries as served do not fold to the head's signed root. The log has been changed since it was signed.",
  "entry-not-in-log":
    "This artefact is not in the adjudicated set the log records.",
  "entry-not-covered":
    "This artefact is in the log but no signed head covers it yet. Check again after the next head is published.",
    "heads-not-consistent":
    "The published heads do not form one history. An earlier head does not carry forward.",
};

function isLogShape(value: unknown): value is Omit<AdjudicationLog, "version"> & {
  version: unknown;
} {
  if (value === null || typeof value !== "object") return false;
  const log = value as Record<string, unknown>;
  return Array.isArray(log.entries) && Array.isArray(log.heads);
}

/** A head is well-shaped when it carries a positive integer size, a 64-hex
 *  root, a published date and a 128-hex signature. An incomplete head is a
 *  malformed log, not a checked failure of some other kind. */
function isHeadShape(value: unknown): value is TreeHead {
  if (value === null || typeof value !== "object") return false;
  const head = value as Record<string, unknown>;
  return (
    typeof head.size === "number" &&
    Number.isInteger(head.size) &&
    head.size >= 1 &&
    typeof head.root === "string" &&
    /^[0-9a-f]{64}$/.test(head.root) &&
    typeof head.published === "string" &&
    head.published !== "" &&
    typeof head.signature === "string" &&
    /^[0-9a-f]{128}$/.test(head.signature)
  );
}

/**
 * The whole-log client audit, run over what was fetched: every head's
 * signature checks against the organiser's key, every head covers exactly
 * the entries it claims, and every head is consistent with the previous
 * one. Nothing here sends data anywhere; the log is read-only.
 */
export async function verifyLog(
  log: unknown,
  publicKey: SigningPublicKey,
): Promise<LogVerification> {
  if (!isLogShape(log)) return fail("log-malformed");
  if (log.version !== LOG_VERSION) return fail("log-version-unsupported");
  if (log.heads.length === 0) {
    // An empty log with no heads is the designed resting state; an empty
    // log that still claims heads is malformed.
    return log.entries.length === 0
      ? { ok: true }
      : fail("head-wrong-size");
  }

  let previous: { size: number; root: string } | undefined;
  for (const head of log.heads) {
    if (!isHeadShape(head)) return fail("log-malformed");
    if (head.size > log.entries.length) return fail("head-wrong-size");
    const signed = await verifyHeadSignature(head, head.signature, publicKey);
    if ("unavailable" in signed) return fail("head-signature-unavailable");
    if (!signed.ok) return fail("head-signature-invalid");

    // The signed root must be the root of the entries as served, under the
    // signed size. A rewrite of any entry below a head lands here.
    const root = await headRoot(log.entries, head.size);
    if (root !== head.root) return fail("head-root-mismatch");
    if (previous !== undefined) {
      if (head.size <= previous.size) {
        // A head must grow the log. A repeated or shrinking head is not one
        // history. (Same-size re-signing is not append; it is a rewrite.)
        return fail("heads-not-consistent");
      }
      const proof = await consistencyPath(
        log.entries.slice(0, head.size).map(entryBytes),
        previous.size,
      );
      const carried = await verifyConsistency(
        previous.size,
        head.size,
        previous.root,
        head.root,
        proof,
      );
      if (!carried.ok) return fail("heads-not-consistent");
    }
    previous = { size: head.size, root: head.root };
  }
  return { ok: true };
}

/** Check one artefact's inclusion in the log under the latest head. */
export async function verifyEntry(
  log: unknown,
  entry: LogEntry,
  publicKey: SigningPublicKey,
): Promise<LogVerification> {
  const whole = await verifyLog(log, publicKey);
  if (!whole.ok) return whole;
  if (!isLogShape(log)) return fail("log-malformed");
  if (log.entries.length === 0) return fail("entry-not-in-log");
  const index = log.entries.findIndex(
    (candidate) => canonicalize(candidate) === canonicalize(entry),
  );
  if (index === -1) return fail("entry-not-in-log");
  // Inclusion under the newest head: the path's length is pinned by the
  // head's size, and the entry index is within it. An entry appended but
  // not yet covered by a signed head is a real state, and says so.
  const head = log.heads[log.heads.length - 1];
  if (head === undefined) return fail("head-wrong-size");
  if (index >= head.size) return fail("entry-not-covered");
  const payload = entryBytes(log.entries[index]);
  const leaves = log.entries.slice(0, head.size).map(entryBytes);
  const path = await inclusionPath(leaves, index);
  const verdict = await verifyInclusion(payload, path, head.root, head.size);
  return verdict.ok ? { ok: true } : fail("entry-not-in-log");
}