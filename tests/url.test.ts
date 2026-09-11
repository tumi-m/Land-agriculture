import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeAt,
  decodeMetric,
  decodeView,
  encodeAt,
  readUrlState,
  sameSelection,
  writeUrlState,
} from "../src/state/url";
import { parentOf, selectionOf } from "../src/state/explorer";

test("every selection kind round-trips through the URL grammar", () => {
  const selections = [
    { kind: "country" } as const,
    { kind: "province", province: "LP" } as const,
    { kind: "district", province: "LP", district: "vhembe-district" } as const,
    {
      kind: "layer",
      province: "LP",
      district: "vhembe-district",
      layer: "soil",
    } as const,
    { kind: "notice", id: "cornucopia" } as const,
    { kind: "point", lng: 30.3521, lat: -23.8391 } as const,
  ];
  for (const selection of selections) {
    const url = writeUrlState({
      at: selection,
      view: "anatomy",
      metric: "advertised",
    });
    const read = readUrlState(url);
    assert.ok(sameSelection(read.at, selection), `${url} lost its selection`);
  }
});

test("view and metric ride along and default away when standard", () => {
  const url = writeUrlState({
    at: { kind: "province", province: "LP" },
    view: "atlas",
    metric: "released",
  });
  assert.ok(url.includes("view=atlas"));
  assert.ok(url.includes("metric=released"));
  const read = readUrlState(url);
  assert.equal(read.view, "atlas");
  assert.equal(read.metric, "released");
  const plain = writeUrlState({
    at: { kind: "country" },
    view: "anatomy",
    metric: "advertised",
  });
  assert.equal(plain, "");
});

test("old ?province= links keep working", () => {
  const read = readUrlState("?province=LP");
  assert.deepEqual(read.at, { kind: "province", province: "LP" });
  assert.deepEqual(readUrlState("?").at, { kind: "country" });
});

test("bad input is rejected, not guessed", () => {
  assert.equal(decodeAt("province:ZZ"), null);
  assert.equal(decodeAt("district:LP:not-a-district"), null);
  assert.equal(
    decodeAt("point:5.0,50.0"),
    null,
    "coordinates outside South Africa are rejected",
  );
  assert.equal(decodeAt("layer:LP:vhembe-district:crust"), null);
  assert.equal(decodeAt("nonsense:x"), null);
  assert.equal(decodeView("atlas"), "atlas");
  assert.equal(decodeView("hologram"), "anatomy");
  assert.equal(decodeMetric("share"), "share");
  assert.equal(decodeMetric("vibes"), "advertised");
});

test("a 21-character SG code is not a point", () => {
  // A code that looks like coordinates must not parse as one.
  assert.equal(decodeAt("point:AB,CD"), null);
});

test("parentOf climbs one level out", () => {
  assert.deepEqual(parentOf({ kind: "province", province: "LP" }), {
    kind: "country",
  });
  assert.deepEqual(
    parentOf({ kind: "district", province: "LP", district: "vhembe-district" }),
    { kind: "province", province: "LP" },
  );
  assert.deepEqual(
    parentOf({
      kind: "layer",
      province: "LP",
      district: "vhembe-district",
      layer: "soil",
    }),
    { kind: "province", province: "LP" },
  );
  assert.deepEqual(parentOf({ kind: "notice", id: "x" }), { kind: "country" });
});

test("selectionOf prefers the most specific state", () => {
  const point = { lng: 30.5, lat: -23.8 };
  assert.deepEqual(
    selectionOf("LP", "vhembe-district", "cornucopia", point),
    { kind: "notice", id: "cornucopia" },
  );
  assert.deepEqual(selectionOf("LP", "vhembe-district", null, point), {
    kind: "point",
    lng: 30.5,
    lat: -23.8,
  });
  assert.deepEqual(selectionOf("LP", "vhembe-district", null, null), {
    kind: "district",
    province: "LP",
    district: "vhembe-district",
  });
  assert.deepEqual(selectionOf("LP", null, null, null), {
    kind: "province",
    province: "LP",
  });
  assert.deepEqual(selectionOf(null, null, null, null), { kind: "country" });
});