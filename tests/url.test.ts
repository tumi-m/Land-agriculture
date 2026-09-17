import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeAt,
  decodeCamera,
  decodeDepth,
  decodeLayers,
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
    { kind: "parcel", sgCode: "T0MS00000000001234567" } as const,
    { kind: "point", lng: 30.3521, lat: -23.8391 } as const,
    { kind: "photo", id: "9a1b2c3d-0000-4000-8000-abcdefabcdef" } as const,
  ];
  for (const selection of selections) {
    const url = writeUrlState({
      at: selection,
      view: "model",
      metric: "advertised",
    });
    const read = readUrlState(url);
    assert.ok(sameSelection(read.at, selection), `${url} lost its selection`);
  }
});

test("view and metric ride along and default away when standard", () => {
  const url = writeUrlState({
    at: { kind: "province", province: "LP" },
    view: "land",
    metric: "released",
  });
  assert.ok(url.includes("view=land"));
  assert.ok(url.includes("metric=released"));
  const read = readUrlState(url);
  assert.equal(read.view, "land");
  assert.equal(read.metric, "released");
  const plain = writeUrlState({
    at: { kind: "country" },
    view: "model",
    metric: "advertised",
  });
  assert.equal(plain, "");
});

test("old ?province= links keep working", () => {
  const read = readUrlState("?province=LP");
  assert.deepEqual(read.at, { kind: "province", province: "LP" });
  assert.deepEqual(readUrlState("?").at, { kind: "country" });
});

test("retired view names resolve to the two that remain", () => {
  assert.equal(decodeView("model"), "model");
  assert.equal(decodeView("land"), "land");
  assert.equal(decodeView("anatomy"), "model");
  assert.equal(decodeView("atlas"), "land");
  assert.equal(decodeView("data"), "land");
  assert.equal(decodeView("hologram"), "model");
});

test("an old ?view=atlas link still opens the land", () => {
  const read = readUrlState("?view=atlas&at=province:LP");
  assert.equal(read.view, "land");
  assert.deepEqual(read.at, { kind: "province", province: "LP" });
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
  assert.equal(decodeMetric("share"), "share");
  assert.equal(decodeMetric("vibes"), "advertised");
});

test("a 21-character SG code is not a point, and a bad code is no parcel", () => {
  // A code that looks like coordinates must not parse as one.
  assert.equal(decodeAt("point:AB,CD"), null);
  // Only exactly 21 letters/digits make a parcel.
  assert.equal(decodeAt("parcel:T0MS00000000001234567")?.kind, "parcel");
  assert.equal(decodeAt("parcel:short"), null);
  assert.equal(decodeAt("parcel:T0MS0000000000123456"), null, "20 chars");
  assert.equal(decodeAt("parcel:T0MS000000000012345678"), null, "22 chars");
  assert.equal(
    decodeAt("parcel:T0MS-0000000001234567"),
    null,
    "punctuation is not a code",
  );
});

test("depth round-trips and only rides when past the assembled rest", () => {
  assert.equal(decodeDepth("0.72"), 0.72);
  assert.equal(decodeDepth("0"), 0);
  assert.equal(decodeDepth(null), null);
  assert.equal(decodeDepth("1.5"), null, "out of range");
  assert.equal(decodeDepth("deep"), null, "not a number");

  const withDepth = writeUrlState({
    at: { kind: "district", province: "LP", district: "vhembe-district" },
    view: "model",
    metric: "advertised",
    depth: 0.72,
  });
  assert.ok(withDepth.includes("depth=0.72"));
  assert.equal(readUrlState(withDepth).depth, 0.72);

  const atRest = writeUrlState({
    at: { kind: "country" },
    view: "model",
    metric: "advertised",
    depth: 0,
  });
  assert.ok(!atRest.includes("depth"), "depth 0 is not written");
});

test("layers round-trip, de-duplicated and in order", () => {
  assert.deepEqual(decodeLayers("landcover,rain,photos"), [
    "landcover",
    "rain",
    "photos",
  ]);
  assert.deepEqual(decodeLayers("rain,rain, landcover ,"), ["rain", "landcover"]);
  assert.deepEqual(decodeLayers(null), []);

  const url = writeUrlState({
    at: { kind: "province", province: "LP" },
    view: "land",
    metric: "advertised",
    layers: ["landcover", "rain"],
  });
  assert.ok(url.includes("layers=landcover%2Crain"));
  assert.deepEqual(readUrlState(url).layers, ["landcover", "rain"]);
});

test("a land camera pose round-trips; the model never writes one", () => {
  const pose = { lng: 28.2, lat: -25.7, zoom: 12.3, bearing: 270, pitch: 45 };
  assert.deepEqual(decodeCamera("28.2,-25.7,12.3,270,45"), pose);
  assert.equal(decodeCamera("28.2,-25.7,12.3"), null, "a partial pose is no pose");
  assert.equal(decodeCamera("95,0,12,0,0"), null, "outside South Africa");
  assert.equal(decodeCamera(null), null);

  const land = writeUrlState({
    at: { kind: "country" },
    view: "land",
    metric: "advertised",
    camera: pose,
  });
  assert.ok(land.includes("cam="));
  assert.deepEqual(readUrlState(land).camera, pose);

  const model = writeUrlState({
    at: { kind: "country" },
    view: "model",
    metric: "advertised",
    camera: pose,
  });
  assert.ok(!model.includes("cam="), "the model does not share a land camera");
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
  assert.deepEqual(parentOf({ kind: "parcel", sgCode: "T0MS00000000001234567" }), {
    kind: "country",
  });
  assert.deepEqual(parentOf({ kind: "photo", id: "p1" }), { kind: "country" });
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
