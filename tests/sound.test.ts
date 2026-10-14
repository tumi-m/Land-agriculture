import assert from "node:assert/strict";
import { test } from "node:test";
import { cueFor } from "../src/lib/sound";
import type { Selection } from "../src/state/explorer";

/** A sound says what just happened, so each change has to make the right one. */

const country: Selection = { kind: "country" };
const kzn: Selection = { kind: "province", province: "KZN" };
const lp: Selection = { kind: "province", province: "LP" };

test("opening something from the whole country opens", () => {
  assert.equal(cueFor(country, kzn), "open");
});

test("going back to the whole country closes", () => {
  assert.equal(cueFor(kzn, country), "close");
});

test("moving from one thing to another selects", () => {
  assert.equal(cueFor(kzn, lp), "select");
  assert.equal(cueFor(kzn, { kind: "district", province: "KZN", district: "ugu" }), "select");
});

test("an equal selection, even a new object, makes no sound", () => {
  assert.equal(cueFor(kzn, { kind: "province", province: "KZN" }), null);
  assert.equal(cueFor(country, { kind: "country" }), null);
});
