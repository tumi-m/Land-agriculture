import assert from "node:assert/strict";
import { test } from "node:test";
import { signedHeadBytes } from "../src/lib/adjudication/signature";
import {
  type AdjudicationLog,
  type LogEntry,
  type TreeHead,
  entryBytes,
  headRoot,
  verifyEntry,
  verifyLog,
} from "../src/lib/adjudication/log";
import { utf8 } from "../src/lib/adjudication/hash";
import { canonicalize } from "../src/lib/adjudication/canonical";
import { readFileSync } from "node:fs";

/**
 * Test-only signing harness. The app only verifies (the organiser signs
 * outside it, M5.6's script holds that key); these fixtures need a signer,
 * so they generate a key per test with the same WebCrypto the app uses.
 */
let signingPair: { publicKeyHex: string; privateKey: CryptoKey } | undefined;

/** One test key: the public half goes to the verifier, the private half
 *  signs. Reused across tests so keygen stays fast. */
async function organiser(): Promise<{ publicKeyHex: string; privateKey: CryptoKey }> {
  if (signingPair === undefined) {
    const subtle = globalThis.crypto.subtle;
    const generated = await subtle.generateKey({ name: "Ed25519" }, true, [
      "sign",
      "verify",
    ]);
    const raw = await subtle.exportKey("raw", generated.publicKey);
    signingPair = {
      publicKeyHex: hex(new Uint8Array(raw)),
      privateKey: generated.privateKey,
    };
  }
  return signingPair;
}

/** A log the way M5.6's builder will emit it: entries plus signed heads. */
async function signedLog(
  entries: LogEntry[],
  sizes: number[],
): Promise<{ log: AdjudicationLog; publicKeyHex: string }> {
  const { privateKey, publicKeyHex } = await organiser();
  const heads: TreeHead[] = [];
  for (const size of sizes) {
    const root = await headRoot(entries, size);
    const unsigned = {
      size,
      root,
      published: "2026-09-17T00:00:00.000Z",
    };
    heads.push(await signHead(unsigned, privateKey));
  }
  return {
    log: { version: 1, entries, heads },
    publicKeyHex,
  };
}

/** A second, unrelated key: a forgery must fail against it. */
async function forger(): Promise<{ publicKeyHex: string }> {
  const subtle = globalThis.crypto.subtle;
  const generated = await subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ]);
  const raw = await subtle.exportKey("raw", generated.publicKey);
  return { publicKeyHex: hex(new Uint8Array(raw)) };
}

async function signHead(
  head: Omit<TreeHead, "signature">,
  privateKey: CryptoKey,
): Promise<TreeHead> {
  const subtle = globalThis.crypto.subtle;
  const payload = await signedHeadBytes(head);
  const copy = new Uint8Array(payload.byteLength);
  copy.set(payload);
  const signature = await subtle.sign({ name: "Ed25519" }, privateKey, copy.buffer);
  return { ...head, signature: hex(new Uint8Array(signature)) };
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const entry = (kind: LogEntry["kind"], artefact: unknown, i: number): LogEntry => ({
  kind,
  published: `2026-01-0${i}`,
  artefact,
});

test("the empty log verifies and the served file is that log", async () => {
  const { publicKeyHex } = await organiser();
  const served = JSON.parse(
    readFileSync("public/adjudication/log.json", "utf8"),
  ) as AdjudicationLog;
  assert.equal(served.entries.length, 0);
  assert.ok(
    (served as { note?: string }).note !== undefined,
    "the empty log carries its note",
  );
  const verdict = await verifyLog(served, publicKeyHex);
  assert.deepEqual(verdict, { ok: true });
});

test("a signed head over real entries verifies in-app", async () => {
  const entries = [
    entry("rubric-commitment", { R: "a".repeat(64) }, 1),
    entry("round-root", { root: "b".repeat(64), round: "NC-2026-01" }, 2),
    entry("rubric-release", { rubric_code: "v1", weights: [1.0] }, 3),
  ];
  const { log, publicKeyHex } = await signedLog(entries, [3]);
  assert.equal((await verifyLog(log, publicKeyHex)).ok, true);
});

test("each published artefact is verifiably in the log", async () => {
  const entries = [
    entry("rubric-commitment", { R: "a".repeat(64) }, 1),
    entry("round-root", { root: "b".repeat(64), round: "NC-2026-01" }, 2),
  ];
  const { log, publicKeyHex } = await signedLog(entries, [2]);
  for (const e of entries) {
    const verdict = await verifyEntry(log, e, publicKeyHex);
    assert.equal(verdict.ok, true, canonicalize(e));
  }
});

test("a tampered entry is rejected", async () => {
  const entries = [
    entry("rubric-commitment", { R: "a".repeat(64) }, 1),
    entry("round-root", { root: "b".repeat(64), round: "NC-2026-01" }, 2),
  ];
  const { log, publicKeyHex } = await signedLog(entries, [2]);
  const tampered: LogEntry = { ...entries[1], artefact: { root: "f".repeat(64) } };
  const verdict = await verifyEntry(log, tampered, publicKeyHex);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, "entry-not-in-log");
});

test("a head claiming the wrong tree size is rejected", async () => {
  const entries = [
    entry("rubric-commitment", { R: "a".repeat(64) }, 1),
    entry("round-root", { root: "b".repeat(64), round: "NC-2026-01" }, 2),
  ];
  const { log, publicKeyHex } = await signedLog(entries, [2]);
  // The head is signed over size 2 but the entry list was truncated to 1.
  const truncated: AdjudicationLog = { ...log, entries: [entries[0]] };
  const verdict = await verifyLog(truncated, publicKeyHex);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, "head-wrong-size");
});

test("a forged signature fails, never passes", async () => {
  const entries = [entry("rubric-commitment", { R: "a".repeat(64) }, 1)];
  const { log, publicKeyHex } = await signedLog(entries, [1]);
  const wrongKey = await forger();
  const verdict = await verifyLog(log, wrongKey.publicKeyHex);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, "head-signature-invalid");
});

test("a rewritten history is rejected with the root-mismatch reason", async () => {
  const entries = [
    entry("rubric-commitment", { R: "a".repeat(64) }, 1),
    entry("round-root", { root: "b".repeat(64), round: "NC-2026-01" }, 2),
    entry("rubric-release", { rubric_code: "v1" }, 3),
  ];
  const { log, publicKeyHex } = await signedLog(entries, [2, 3]);
  // Rewrite: replace the second entry, keep the heads. The size-2 head's
  // signed root no longer matches the entries as served.
  const rewritten: LogEntry = {
    ...entries[1],
    artefact: { root: "0".repeat(64), round: "NC-2026-01" },
  };
  const doctored: AdjudicationLog = {
    ...log,
    entries: [entries[0], rewritten, entries[2]],
  };
  const verdict = await verifyLog(doctored, publicKeyHex);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, "head-root-mismatch");
});

test("a head that does not grow the log is rejected", async () => {
  const entries = [entry("rubric-commitment", { R: "a".repeat(64) }, 1)];
  const { log, publicKeyHex } = await signedLog(entries, [1, 1]);
  const verdict = await verifyLog(log, publicKeyHex);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, "heads-not-consistent");
});

test("a malformed log is rejected without guessing", async () => {
  const { publicKeyHex } = await organiser();
  assert.equal((await verifyLog(null, publicKeyHex)).reason, "log-malformed");
  assert.equal((await verifyLog({}, publicKeyHex)).reason, "log-malformed");
  assert.equal(
    (await verifyLog({ version: 2, entries: [], heads: [] }, publicKeyHex)).reason,
    "log-version-unsupported",
  );
  assert.equal(
    (await verifyLog({ version: 1, entries: [], heads: [{ size: 1 }] }, publicKeyHex)).reason,
    "log-malformed",
  );
});

test("entryBytes is the canonical JSON of the whole entry", async () => {
  const e = entry("round-root", { root: "b".repeat(64) }, 2);
  assert.deepEqual(
    entryBytes(e),
    utf8(canonicalize(e)),
  );
  // Key order does not matter: same entry, same bytes.
  const reordered: LogEntry = {
    artefact: { root: "b".repeat(64) },
    published: e.published,
    kind: e.kind,
  };
  assert.deepEqual(entryBytes(reordered), entryBytes(e));
});

test("an entry appended after the newest head says so, and never crashes", async () => {
  const entries = [
    entry("rubric-commitment", { R: "a".repeat(64) }, 1),
    entry("round-root", { root: "b".repeat(64), round: "NC-2026-01" }, 2),
  ];
  const { log, publicKeyHex } = await signedLog(entries, [1]);
  // The published head covers only the first entry; the second is a real
  // append awaiting its head. The whole log still verifies; the uncovered
  // entry gets its own reason instead of an out-of-range crash.
  assert.equal((await verifyLog(log, publicKeyHex)).ok, true);
  const verdict = await verifyEntry(log, entries[1], publicKeyHex);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, "entry-not-covered");
  assert.ok(verdict.message !== undefined && verdict.message !== "");
});

test("headRoot grows monotonically as entries append", async () => {
  const entries = [
    entry("rubric-commitment", { R: "a".repeat(64) }, 1),
    entry("round-root", { root: "b".repeat(64) }, 2),
  ];
  const first = await headRoot(entries, 1);
  const second = await headRoot(entries, 2);
  assert.notEqual(first, second);
  assert.equal(await headRoot(entries), second);
  await assert.rejects(() => headRoot(entries, 3), RangeError);
});