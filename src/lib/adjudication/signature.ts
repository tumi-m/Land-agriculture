/**
 * Ed25519 signatures for the adjudication layer, via WebCrypto only — the
 * same rule as `hash.ts`: no Node builtins, so the browser, the scripts and
 * the test harness run one code path. The signed data is the canonical form
 * of the tree head, domain-prefixed like every other hash input
 * (docs/inventions/01: a client with only the organiser's public key can
 * verify the log is one history, not a fork).
 *
 * Browsers without Ed25519 in WebCrypto (older Safari) are a designed-for
 * case, not an error: `checkAvailability()` distinguishes "cannot check"
 * from "checked and false", and the UI must never silently pass the first
 * as the second.
 */
import { canonicalize } from "./canonical";
import { utf8 } from "./hash";

/** Ed25519, as the WebCrypto identifier spells it. */
export const SIGNATURE_ALGORITHM = "Ed25519" as const;

/** The signature's own sub-domain, so a head signature is never verifiable
 *  as, say, a JWT made over the same bytes. */
export const SIGNED_HEAD_DOMAIN = "asbonge/adjudication/head";

/** A public key as lower-case hex, 64 characters (32 bytes). */
export type SigningPublicKey = string;

/** A signature as lower-case hex, 128 characters (64 bytes). */
export type Signature = string;

export type Availability =
  | { available: true }
  | { available: false; reason: string };

/**
 * Whether this runtime can verify heads at all. The distinction the record
 * requires: "check unavailable" is a state the caller must show, never a
 * silent pass.
 */
export function checkAvailability(): Availability {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) {
    return {
      available: false,
      reason:
        "check unavailable: this browser has no WebCrypto (needs HTTPS or a modern runtime)",
    };
  }
  if (typeof subtle.verify !== "function") {
    return {
      available: false,
      reason: "check unavailable: this browser's WebCrypto cannot verify",
    };
  }
  return { available: true };
}

/** The bytes a head is signed over: DOMAIN/head/ ‖ canonical JSON ‖ /. */
export async function signedHeadBytes(
  head: unknown,
): Promise<Uint8Array> {
  const parts = [
    utf8(SIGNED_HEAD_DOMAIN),
    utf8("/head/"),
    utf8(canonicalize(head)),
    utf8("/"),
  ];
  // The same concatenation discipline as hashParts in hash.ts: one buffer,
  // in order. The bytes are the signature payload, so they are returned
  // rather than hashed.
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const all = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    all.set(part, offset);
    offset += part.byteLength;
  }
  return all;
}

function hexToBytes(hex: string): Uint8Array {
  const bare = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (bare.length === 0 || bare.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(bare)) {
    throw new TypeError(`not a hex string: ${hex}`);
  }
  const out = new Uint8Array(bare.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(bare.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Import an Ed25519 public key from hex. WebCrypto calls the raw format
 *  "raw", as the spec does. */
async function importPublic(publicKey: SigningPublicKey): Promise<CryptoKey> {
  const raw = hexToBytes(publicKey);
  if (raw.byteLength !== 32) {
    throw new TypeError(
      `an Ed25519 public key is 32 bytes, got ${raw.byteLength}`,
    );
  }
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) {
    throw new Error(
      "check unavailable: this browser has no WebCrypto (needs HTTPS or a modern runtime)",
    );
  }
  // Copy into a fresh ArrayBuffer: SubtleCrypto.importKey takes BufferSource,
  // and a view's own buffer does not type-check as one (same discipline as
  // sha256Hex in hash.ts).
  const copy = new Uint8Array(raw.byteLength);
  copy.set(raw);
  return subtle.importKey("raw", copy.buffer, { name: SIGNATURE_ALGORITHM }, true, [
    "verify",
  ]);
}

export type HeadVerification =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "signature-not-hex"
        | "signature-wrong-length"
        | "key-not-a-digest"
        | "signature-invalid";
    }
  | { unavailable: true; reason: string };

/** The head minus the field that attests it: a signature never covers
 *  itself. Everything else (size, root, published) is signed. Accepts the
 *  log's TreeHead by value; no import back into this module. */
export function unsignedHead(
  head: Record<string, unknown> | object,
): Record<string, unknown> {
  const record = head as Record<string, unknown>;
  const unsigned: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(record)) {
    if (field !== "signature") unsigned[field] = value;
  }
  return unsigned;
}

/**
 * Verify a head's Ed25519 signature against the organiser's public key.
 * The three outcomes are distinct on purpose: `ok` is the only pass,
 * `ok: false` is a checked failure with a fixed phrase, and `unavailable`
 * is "check unavailable" — shown, never silently passed.
 */
export async function verifyHeadSignature(
  head: Record<string, unknown> | object,
  signature: string,
  publicKey: SigningPublicKey,
): Promise<HeadVerification> {
  const availability = checkAvailability();
  if (!availability.available) {
    return { unavailable: true, reason: availability.reason };
  }
  let sigBytes: Uint8Array;
  try {
    sigBytes = hexToBytes(signature);
  } catch {
    return { ok: false, reason: "signature-not-hex" };
  }
  if (sigBytes.byteLength !== 64) {
    return { ok: false, reason: "signature-wrong-length" };
  }
  // A key that is not 32 bytes of hex is a malformed input, not a bad
  // signature: say so rather than blaming the signature.
  try {
    if (hexToBytes(publicKey).byteLength !== 32) {
      return { ok: false, reason: "key-not-a-digest" };
    }
  } catch {
    return { ok: false, reason: "key-not-a-digest" };
  }
  const payload = await signedHeadBytes(unsignedHead(head));
  // Copy into a fresh ArrayBuffer: SubtleCrypto.verify takes BufferSource.
  const payloadCopy = new Uint8Array(payload.byteLength);
  payloadCopy.set(payload);
  const sigCopy = new Uint8Array(sigBytes.byteLength);
  sigCopy.set(sigBytes);
  try {
    const key = await importPublic(publicKey);
    const valid = await globalThis.crypto.subtle.verify(
      { name: SIGNATURE_ALGORITHM },
      key,
      sigCopy.buffer,
      payloadCopy.buffer,
    );
    return valid
      ? { ok: true }
      : { ok: false, reason: "signature-invalid" };
  } catch (error) {
    // An Ed25519 operation throwing in a runtime that claimed availability
    // is still a failure, never a pass — surface it as an unavailable check
    // rather than crashing the whole verification.
    return { unavailable: true, reason: `check unavailable: ${String(error)}` };
  }
}