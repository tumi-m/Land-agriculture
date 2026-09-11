import assert from "node:assert/strict";
import { test } from "node:test";
import { group, plural } from "../src/lib/format";

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