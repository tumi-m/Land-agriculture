import assert from "node:assert/strict";
import { test } from "node:test";
import { decimal, group, plural, rand, sastDate, sastDateTime } from "../src/lib/format";

test("group() separates thousands without breaking negatives or fractions", () => {
  assert.equal(group(0), "0");
  assert.equal(group(7), "7");
  assert.equal(group(999), "999");
  assert.equal(group(1000), "1\u202f000");
  assert.equal(group(1234567), "1\u202f234\u202f567");
  assert.equal(group(-1234567), "-1\u202f234\u202f567");
});

test("plural() picks the singular only for exactly one", () => {
  assert.equal(plural(0, "advert", "adverts"), "adverts");
  assert.equal(plural(1, "advert", "adverts"), "advert");
  assert.equal(plural(2, "advert", "adverts"), "adverts");
  assert.equal(plural(15, "advert", "adverts"), "adverts");
  assert.equal(plural(1, "advert"), "advert");
  assert.equal(plural(2, "advert"), "adverts");
});
/**
 * Deterministic formatting. Intl output depends on the ICU data the runtime
 * ships: Node rendered a notice's 21.4154 ha as "21,4" and Chromium hydrated
 * it as "21.4", which is a hydration mismatch — React then throws away the
 * whole server-rendered page and draws it again on the client.
 */

test("decimal groups thousands and trims trailing zeros", () => {
  assert.equal(decimal(21.4154, 1), "21.4");
  assert.equal(decimal(21.4154, 4), "21.4154");
  assert.equal(decimal(1076.6, 1), "1 076.6");
  assert.equal(decimal(5, 2), "5");
  assert.equal(decimal(-1234.5, 1), "-1 234.5");
});

test("rand rounds to whole rand and groups", () => {
  assert.equal(rand(1_250_000), "R 1 250 000");
  assert.equal(rand(1249.6), "R 1 250");
  assert.equal(rand(-500), "-R 500");
});

test("deadlines read in SAST whatever zone the runtime is in", () => {
  // 16:00 SAST is 14:00 UTC the same day.
  assert.equal(sastDate("2026-09-21T16:00:00+02:00"), "21 Sep 2026");
  assert.equal(sastDateTime("2026-09-21T16:00:00+02:00"), "21 Sep 2026, 16:00");
  // 00:30 SAST is 22:30 UTC the previous day: a UTC formatter would show the
  // wrong date, and a South African would miss the deadline by a day.
  assert.equal(sastDate("2026-10-01T00:30:00+02:00"), "1 Oct 2026");
  assert.equal(sastDateTime("2026-10-01T00:30:00+02:00"), "1 Oct 2026, 00:30");
});
