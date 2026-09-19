import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeUrlSearch } from "../src/state/url";

/**
 * The writer owns seven query keys and nothing else. A link that arrives with
 * a campaign tag, a referrer or anything else must still carry it after the
 * explorer writes its own state.
 */

const country = { at: { kind: "country" } as const, view: "model" as const, metric: "advertised" as const };

test("parameters the app does not own survive a write", () => {
  const search = mergeUrlSearch("?utm_source=whatsapp&ref=extension", {
    at: { kind: "province", province: "NC" },
    view: "land",
    metric: "advertised",
  });
  const params = new URLSearchParams(search);
  assert.equal(params.get("utm_source"), "whatsapp");
  assert.equal(params.get("ref"), "extension");
  assert.equal(params.get("at"), "province:NC");
  assert.equal(params.get("view"), "land");
});

test("the app's own keys are replaced, never duplicated", () => {
  const search = mergeUrlSearch("?at=province:LP&view=land&metric=released", {
    at: { kind: "district", province: "NC", district: "zf-mgcawu-district" },
    view: "land",
    metric: "advertised",
  });
  const params = new URLSearchParams(search);
  assert.deepEqual(params.getAll("at"), ["district:NC:zf-mgcawu-district"]);
  assert.equal(params.get("metric"), null);
  assert.equal(params.get("view"), "land");
});

test("a legacy province link is rewritten into the at grammar", () => {
  const search = mergeUrlSearch("?province=LP", {
    at: { kind: "province", province: "LP" },
    view: "model",
    metric: "advertised",
  });
  // URLSearchParams percent-encodes the separator, which is what the app has
  // always written and what decodeAt reads back.
  assert.equal(search, "?at=province%3ALP");
});

test("the country in the model view leaves a clean link", () => {
  assert.equal(mergeUrlSearch("", country), "");
  assert.equal(mergeUrlSearch("?at=province:LP&view=land", country), "");
  assert.equal(mergeUrlSearch("?utm=x", country), "?utm=x");
});

test("writing the same state twice changes nothing", () => {
  const first = mergeUrlSearch("?utm=x", {
    at: { kind: "notice", id: "cornucopia" },
    view: "land",
    metric: "advertised",
  });
  assert.equal(mergeUrlSearch(first, {
    at: { kind: "notice", id: "cornucopia" },
    view: "land",
    metric: "advertised",
  }), first);
  assert.match(first, /at=notice%3Acornucopia/);
});
