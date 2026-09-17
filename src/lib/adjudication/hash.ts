/**
 * Hashing for the adjudication layer. SHA-256 over UTF-8 bytes, via WebCrypto
 * only — never `node:crypto` — so the same code produces the same digest in
 * the browser, in scripts and in the e2e harness. Node 16+ exposes WebCrypto
 * at `globalThis.crypto.subtle`, which is what both runtimes share.
 *
 * Every digest carries the scheme's domain prefix so a hash minted here is
 * never confused with one minted for another purpose over the same payload
 * (RFC 6962's leaf-versus-node separation, generalised).
 */
import { canonicalize } from "./canonical";

/** Prepended to every hash input in the scheme, with a `/kind/` after it. */
export const DOMAIN_HASH = /* @__PURE__ */ new TextEncoder().encode(
  "asbonge/adjudication",
);

export function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Lower-case hex of a 0x-prefixed or bare hex string, or null if not hex. */
export function normalizeHex(text: string): string | null {
  const bare = text.startsWith("0x") ? text.slice(2) : text;
  return /^[0-9a-f]+$/i.test(bare) ? bare.toLowerCase() : null;
}

/** Bytes of a lower-case hex digest. Throws on non-hex input. */
export function hexToBytes(digest: string): Uint8Array {
  const bare = normalizeHex(digest);
  if (bare === null) throw new TypeError(`not a hex digest: ${digest}`);
  const out = new Uint8Array(bare.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(bare.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function assertSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) {
    throw new Error(
      "check unavailable: this browser has no WebCrypto (needs HTTPS or a modern runtime)",
    );
  }
  return subtle;
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** sha256 of the given bytes, as lower-case hex. */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  // Copy into a fresh ArrayBuffer: SubtleCrypto.digest takes BufferSource,
  // and a view over a SharedArrayBuffer does not type-check as one.
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return toHex(await assertSubtle().digest("SHA-256", copy.buffer));
}

/** sha256 of the canonical form of a JSON value. */
export async function hashJson(value: unknown): Promise<string> {
  return sha256Hex(utf8(canonicalize(value)));
}

/** sha256 of several parts concatenated in order. Buffers go in as-is;
 *  strings are UTF-8 encoded. */
export async function hashParts(
  parts: ReadonlyArray<Uint8Array | string>,
): Promise<string> {
  const chunks = parts.map((part) =>
    part instanceof Uint8Array ? part : utf8(String(part)),
  );
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const all = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return sha256Hex(all);
}
