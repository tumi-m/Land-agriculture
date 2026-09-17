import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalize } from "../src/lib/adjudication/canonical";
import {
  DOMAIN_HASH,
  hashJson,
  hashParts,
  normalizeHex,
  sha256Hex,
  utf8,
} from "../src/lib/adjudication/hash";

/**
 * The published vectors for the adjudication hashing scheme
 * (docs/inventions/01, Measurements). Any conforming implementation of the
 * canonicalisation must reproduce these strings; the digests follow from them
 * and the sha256("") reference value.
 */
const CANON_VECTORS = [
  { input: null, canonical: "null" },
  { input: false, canonical: "false" },
  { input: true, canonical: "true" },
  { input: 0, canonical: "0.0" },
  { input: 255, canonical: "255.0" },
  { input: -255, canonical: "-255.0" },
  { input: 1.5, canonical: "1.5" },
  { input: -0.5, canonical: "-0.5" },
  { input: Number.MAX_SAFE_INTEGER, canonical: "9007199254740991.0" },
  { input: Number.MIN_SAFE_INTEGER, canonical: "-9007199254740991.0" },
  { input: 4.5e-7, canonical: "0.00000045" },
  { input: 1234567890123.4004, canonical: "1234567890123.4004" },
  { input: "aB😀", canonical: JSON.stringify("aB😀") },
  {
    input: { z: [true, "x"], a: 1, "m m": { b: null, a: 2.5 } },
    canonical: `{"a":1.0,"m m":{"a":2.5,"b":null},"z":[true,"x"]}`,
  },
];

test("canonicalize reproduces the published vectors", () => {
  for (const { input, canonical } of CANON_VECTORS) {
    assert.equal(canonicalize(input), canonical, JSON.stringify(input));
  }
});

test("hashJson is the sha256 of the UTF-8 canonical string", async () => {
  // This pair of values is one published digest: hashJson({a: 1}).
  const digest = await hashJson({ a: 1 });
  const direct = await sha256Hex(utf8('{"a":1.0}'));
  assert.equal(digest, direct);
  // The sha256 reference point itself, FIPS 180-4 §B.1.
  assert.equal(
    await sha256Hex(utf8("")),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
});

test("key order never changes the digest", async () => {
  assert.equal(
    await hashJson({ rubric: "x", a: 1 }),
    await hashJson({ a: 1, rubric: "x" }),
  );
});

test("non-finite and unsafe numbers are refused, not hashed", () => {
  assert.throws(() => canonicalize(Number.POSITIVE_INFINITY), TypeError);
  assert.throws(() => canonicalize(Number.NaN), TypeError);
  assert.throws(
    () => canonicalize(Number.MAX_SAFE_INTEGER + 1.5),
    TypeError,
  );
  assert.throws(() => canonicalize(2 * Number.MAX_SAFE_INTEGER), TypeError);
});

test("numbers spell out with the engine's shortest decimal", () => {
  // Fractions render by ECMAScript's Number-to-String (the shortest decimal
  // that reads back to the same double), expanded to plain notation, so a
  // hash never depends on an engine's taste for exponents.
  assert.equal(canonicalize(0.1), "0.1");
  assert.equal(canonicalize(1 / 3), "0.3333333333333333");
});

test("objects and arrays reject unhashable fields with a named reason", () => {
  assert.throws(
    () => canonicalize({ a: undefined }),
    TypeError('field "a" is not a JSON value'),
  );
  assert.throws(() => canonicalize(() => 1), TypeError);
  assert.throws(() => canonicalize(Symbol("x")), TypeError);
});

test("normalizeHex strips a 0x prefix and rejects non-hex", () => {
  assert.equal(normalizeHex("0xABCDEF"), "abcdef");
  assert.equal(normalizeHex("ABCDEF"), "abcdef");
  assert.equal(normalizeHex("xyz"), null);
  assert.equal(normalizeHex("0xz1"), null);
  assert.equal(normalizeHex(""), null);
});

test("DOMAIN_HASH namespaces every digest", async () => {
  // H(payload) with the domain differs from a bare H(payload).
  const bare = await sha256Hex(utf8("leaf"));
  const domained = await hashParts([DOMAIN_HASH, "/leaf/", utf8("leaf"), "/"]);
  assert.notEqual(domained, bare);
});

test("the scheme's own leaf/node vectors hold", async () => {
  const leafOf = (payload: Uint8Array) =>
    hashParts([DOMAIN_HASH, "/leaf/", payload, "/"]);
  const nodeOf = (left: string, right: string) =>
    hashParts([
      DOMAIN_HASH,
      "/node/",
      Uint8Array.from(Buffer.from(left, "hex")),
      Uint8Array.from(Buffer.from(right, "hex")),
    ]);
  const L = await leafOf(utf8(""));
  const L123 = await leafOf(utf8("123"));
  assert.equal(
    L,
    "c550453c7c5425482b93ac3aea8cde5436b04315636562a39422bf3ea7a2f447",
  );
  assert.equal(
    L123,
    "2919c0db0e7b7aa17087a47dd08c1b5a836393ae4225d76462a36818ddcfbcc8",
  );
  assert.equal(
    await nodeOf(L, L123),
    "846ffd225be9cb70c656f8d83c94f34c0042aff9206ff21d621b2e078e901040",
  );
});
