import assert from "node:assert/strict";
import { test } from "node:test";
import { FARM_NOTICES } from "../src/content/farm-notices";
import { NOTICE_PARCELS } from "../src/lib/cadastre";
import { emptyMessage, normalise, parseCoordinates, parseSgCode, search } from "../src/lib/search";

/**
 * What a person types should land them on the thing they meant, and
 * something pasted from a document should be read for what it is.
 */

test("a district's name finds the district first", () => {
  const [first] = search("vhembe");
  assert.equal(first.kind, "district");
  assert.equal(first.kind === "district" && first.district, "vhembe-district");
});

test("a province's name finds the province first", () => {
  const [first] = search("limpopo");
  assert.deepEqual(first.kind === "province" && first.province, "LP");
});

test("a farm use finds the notices that advertise it, and only those", () => {
  for (const use of ["poultry", "dairy"]) {
    const hits = search(use);
    const advertising = FARM_NOTICES.filter((n) => new RegExp(use, "i").test(n.use));
    assert.equal(hits.length, Math.min(advertising.length, 8), use);
    for (const hit of hits) {
      assert.equal(hit.kind, "notice");
      const notice = FARM_NOTICES.find((n) => hit.kind === "notice" && n.id === hit.id)!;
      assert.match(notice.use, new RegExp(use, "i"));
    }
  }
});

test("a use no notice mentions finds nothing rather than something near", () => {
  assert.equal(FARM_NOTICES.filter((n) => /aquaculture/i.test(n.use)).length, 0);
  assert.deepEqual(search("aquaculture"), []);
});

test("accents, case and punctuation do not matter", () => {
  assert.equal(normalise("  KwaZulu-Natal!  "), "kwazulu natal");
  assert.deepEqual(search("KWAZULU-natal")[0], search("kwazulu natal")[0]);
});

test("coordinates are read in either order and with hemispheres", () => {
  const want = { lng: 30.3521, lat: -23.8391 };
  assert.deepEqual(parseCoordinates("-23.8391, 30.3521"), want);
  assert.deepEqual(parseCoordinates("30.3521 -23.8391"), want);
  assert.deepEqual(parseCoordinates("23.8391 S 30.3521 E"), want);
  assert.deepEqual(parseCoordinates("23.8391°S, 30.3521°E"), want);
  const [hit] = search("-23.8391, 30.3521");
  assert.equal(hit.kind, "point");
});

test("a point outside South Africa is refused, not moved", () => {
  assert.equal(parseCoordinates("51.5074, -0.1278"), "outside");
  assert.deepEqual(search("51.5074, -0.1278"), []);
  assert.equal(parseCoordinates("Vhembe"), null);
});

test("a Surveyor-General code opens the notice its parcel is matched to", () => {
  const { cadastralId, noticeId } = NOTICE_PARCELS.features[0].properties;
  assert.equal(parseSgCode(cadastralId.toLowerCase().replace(/(.{4})/g, "$1 ")), cadastralId);
  const [hit] = search(cadastralId);
  assert.equal(hit.kind, "notice");
  assert.equal(hit.kind === "notice" && hit.id, noticeId);
  assert.equal(parseSgCode("not a code at all, too short"), null);
});

test("a code with no matched notice, or a point abroad, says why it found nothing", () => {
  assert.deepEqual(search("T0LT00000000099900001"), []);
  assert.match(emptyMessage("T0LT00000000099900001"), /Surveyor-General code/);
  assert.match(emptyMessage("51.5074, -0.1278"), /outside South Africa/);
  assert.match(emptyMessage("aquaculture"), /Nothing matches/);
});

test("results are capped and always come back in the same order", () => {
  assert.ok(search("district", 5).length <= 5);
  assert.deepEqual(search("cape"), search("cape"));
  assert.deepEqual(search(""), []);
});
