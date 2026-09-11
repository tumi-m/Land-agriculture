import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTokenTriplet } from "../src/lib/tokens";

test("token triplets become rgb() colours", () => {
  assert.equal(parseTokenTriplet("26 112 75"), "rgb(26, 112, 75)");
  assert.equal(parseTokenTriplet("  232   237 233\n"), "rgb(232, 237, 233)");
});

test("malformed triplets fail loudly", () => {
  assert.throws(() => parseTokenTriplet(""), /triplet/);
  assert.throws(() => parseTokenTriplet("26 112"), /triplet/);
  assert.throws(() => parseTokenTriplet("red green blue"), /triplet/);
});
