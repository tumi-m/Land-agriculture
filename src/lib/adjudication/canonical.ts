/**
 * Deterministic JSON serialisation for the adjudication layer. Every hash in
 * the scheme is taken over the output of `canonicalize`, so two engines that
 * hold the same JSON value must produce the same string before they can agree
 * on a hash.
 *
 * The rules:
 *
 * - Object entries are sorted by the UTF-8 bytes of their (already serialised)
 *   `"key":value` strings. Sorting whole entries rather than bare keys means
 *   key order can never depend on a hash-colliding prefix.
 * - Numbers render as plain decimal with a mandatory fraction — integers as
 *   `4.0` — so a value never depends on whether an engine prefers exponents.
 *   Integers are exact up to `Number.MAX_SAFE_INTEGER`. Anything else goes
 *   through the shortest round-trip precision and must come back exactly; a
 *   number that cannot be pinned (fractions with no exact decimal form, like
 *   0.1) is rejected with a named error instead of being hashed as a guess.
 * - Strings are JSON strings as `JSON.stringify` emits them (short escapes,
 *   non-ASCII left as literal UTF-8).
 *
 * This module is pure and synchronous; hashing lives in `hash.ts`. No Node
 * builtins — it must run in the browser and in scripts.
 */

/**
 * Render a finite number as a plain decimal string with a fraction. Returns
 * null for anything that is not finite or is an integer beyond the safe
 * range (where `Number` can no longer tell two neighbours apart).
 *
 * Fractions use ECMAScript's Number-to-String, which the language spec pins
 * as the shortest decimal that reads back to the same double — `0.1` is
 * "0.1", `1/3` is "0.3333333333333333" — expanded into a plain decimal so
 * no engine's taste for exponents leaks into a hash.
 */
function canonicalizeNumber(value: number): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (Number.isInteger(value)) {
    if (Math.abs(value) > Number.MAX_SAFE_INTEGER) return null;
    // JSON reads -0 as 0; keep one rendering for it.
    return `${Object.is(value, -0) ? 0 : value}.0`;
  }
  return expandDecimal(String(value));
}

/** Expand a Number-to-String spelling — plain or `1.23e-7` — into a plain
 *  decimal string. Returns null for anything not in those two shapes. */
function expandDecimal(rendered: string): string | null {
  const plain = /^(-?)(\d+)(?:\.(\d+))?$/.exec(rendered);
  if (plain) {
    const frac = (plain[3] ?? "").replace(/0+$/, "");
    return `${plain[1]}${plain[2]}.${frac === "" ? "0" : frac}`;
  }
  const scientific = /^(-?)(\d)(?:\.(\d+))?e([+-])(\d+)$/.exec(rendered);
  if (!scientific) return null;
  const sign = scientific[1];
  const digits = `${scientific[2]}${scientific[3] ?? ""}`;
  const exponent = (scientific[4] === "-" ? -1 : 1) * Number(scientific[5]);
  const point = 1 + exponent;
  if (point <= 0) {
    return `${sign}0.${"0".repeat(-point)}${digits}`;
  }
  if (point >= digits.length) {
    return `${sign}${digits}${"0".repeat(point - digits.length)}.0`;
  }
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}

function compareUtf8(a: string, b: string): number {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i += 1) {
    if (x[i] !== y[i]) return x[i] - y[i];
  }
  return x.length - y.length;
}

/** The canonical JSON string for a value. Throws a TypeError naming the
 *  offending field for anything outside the JSON data model. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    const out = canonicalizeNumber(value);
    if (out === null) {
      throw new TypeError(
        `not a JSON number this scheme can fix: ${value} (fractions must have an exact decimal form)`,
      );
    }
    return out;
  }
  if (Array.isArray(value)) {
    const inner = value.map((item) => canonicalize(item)).join(",");
    return `[${inner}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const parts: string[] = [];
    for (const key of Object.keys(record)) {
      const field = record[key];
      if (
        field === undefined ||
        typeof field === "function" ||
        typeof field === "symbol"
      ) {
        throw new TypeError(`field "${key}" is not a JSON value`);
      }
      parts.push(`${JSON.stringify(key)}:${canonicalize(field)}`);
    }
    parts.sort(compareUtf8);
    return `{${parts.join(",")}}`;
  }
  throw new TypeError("not a JSON value");
}
