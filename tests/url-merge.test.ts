import assert from "node:assert/strict";
import { test } from "node:test";
import { isNavigation, mergeUrlSearch } from "../src/state/url";

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

/**
 * Which writes get a history entry.
 *
 * The defect this fixes: every write replaced the current entry, so Back
 * left the site from the first screen. The opposite mistake is worse — an
 * entry per slider tick makes Back useless — so only a change of place
 * counts as navigation.
 */

const at = {
  country: { kind: "country" } as const,
  lp: { kind: "province", province: "LP" } as const,
  nc: { kind: "province", province: "NC" } as const,
  mopani: { kind: "district", province: "LP", district: "mopani-district" } as const,
};
const base = { view: "model" as const, metric: "advertised" as const };

test("the first write of a session replaces, so arriving leaves no entry behind", () => {
  assert.equal(isNavigation(null, { ...base, at: at.lp }), false);
});

test("a new place gets its own entry", () => {
  assert.equal(isNavigation({ ...base, at: at.country }, { ...base, at: at.lp }), true);
  assert.equal(isNavigation({ ...base, at: at.lp }, { ...base, at: at.mopani }), true);
  assert.equal(isNavigation({ ...base, at: at.lp }, { ...base, at: at.nc }), true);
  assert.equal(isNavigation({ ...base, at: at.mopani }, { ...base, at: at.country }), true);
});

test("going to the land and back to the model is navigation", () => {
  assert.equal(
    isNavigation({ ...base, at: at.lp }, { ...base, at: at.lp, view: "land" }),
    true,
  );
});

test("the measure, the depth and the camera adjust one place and replace", () => {
  const here = { ...base, at: at.mopani };
  assert.equal(isNavigation(here, { ...here, metric: "released" }), false);
  assert.equal(isNavigation(here, { ...here, depth: 0.42 }), false);
  assert.equal(
    isNavigation(
      { ...here, view: "land" as const },
      { ...here, view: "land" as const, camera: { lng: 30, lat: -23, zoom: 9, bearing: 0, pitch: 45 } },
    ),
    false,
  );
});

test("a slider drag leaves one entry, not one per tick", () => {
  const here = { ...base, at: at.mopani };
  let entries = 0;
  let previous = here;
  for (const depth of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]) {
    const next = { ...here, depth };
    if (isNavigation(previous, next)) entries += 1;
    previous = next;
  }
  assert.equal(entries, 0);
});

test("re-writing the same place replaces, which is what keeps Back working", () => {
  // After popstate adopts the restored entry, the write that follows must
  // not push: otherwise Back lands where it started and never leaves.
  const restored = { ...base, at: at.lp };
  assert.equal(isNavigation(restored, { ...base, at: at.lp }), false);
});

/**
 * The land camera in a shared link.
 *
 * `cam` has round-tripped through the codec since M1.2, but nothing wrote
 * one: `setCamera` had no caller, so every land link opened at the default
 * framing over Limpopo whatever the sharer was looking at.
 */

const pose = { lng: 21.2534, lat: -28.4512, zoom: 12.4, bearing: -24, pitch: 50 };

test("a land link carries the pose the sharer was looking at", () => {
  const search = mergeUrlSearch("", {
    at: { kind: "point", lng: 21.2534, lat: -28.4512 },
    view: "land",
    metric: "advertised",
    camera: pose,
  });
  const cam = new URLSearchParams(search).get("cam");
  assert.ok(cam, "a land view with a pose must write cam");
  assert.match(cam ?? "", /^21\.25340,-28\.45120,12\.4,-24,50$/);
});

test("the model never writes a camera, however one got into the store", () => {
  // The model's camera is a preset, not a pose, and a cam= on a model link
  // would be read back by nothing.
  const search = mergeUrlSearch("", {
    at: { kind: "province", province: "NC" },
    view: "model",
    metric: "advertised",
    camera: pose,
  });
  assert.equal(new URLSearchParams(search).get("cam"), null);
});

test("panning replaces the entry rather than stacking one per move", () => {
  // moveend fires on every pan and zoom. If each one were navigation, Back
  // would crawl through the whole pan instead of leaving the land view.
  const here = {
    at: { kind: "district", province: "NC", district: "zf-mgcawu-district" } as const,
    view: "land" as const,
    metric: "advertised" as const,
  };
  let entries = 0;
  let previous = { ...here, camera: pose };
  for (const zoom of [12.5, 12.9, 13.4, 14.0]) {
    const next = { ...here, camera: { ...pose, zoom } };
    if (isNavigation(previous, next)) entries += 1;
    previous = next;
  }
  assert.equal(entries, 0);
});
