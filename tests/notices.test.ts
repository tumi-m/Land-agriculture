import assert from "node:assert/strict";
import { test } from "node:test";
import { FARM_NOTICES } from "../src/content/farm-notices";
import coverage from "../src/content/notice-coverage.json";
import { DISTRICTS_BY_PROVINCE } from "../src/lib/geo";
import { noticeInDistrict } from "../src/lib/exploded-map";

/**
 * Rules for the notice records, checked against the tree rather than trusted.
 *
 * The index snapshot in notice-coverage.json is the denominator: every
 * document it lists has to be either a notice here or an excluded document
 * with a stated reason. That is what makes the coverage line on the page a
 * fact instead of a claim.
 */

const ISO_SAST = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+02:00$/;

test("every reviewed document is either carried or excluded, with a reason", () => {
  const carried = new Set(FARM_NOTICES.map((notice) => notice.file));
  const excluded = new Map(
    coverage.excludedFiles.map((entry) => [entry.file, entry.reason]),
  );
  for (const file of coverage.reviewedFiles) {
    assert.ok(
      carried.has(file) || excluded.has(file),
      `${file} was reviewed but is neither carried nor excluded`,
    );
  }
  for (const file of carried) {
    assert.ok(
      (coverage.reviewedFiles as string[]).includes(file),
      `${file} is carried but is not in the reviewed index`,
    );
    assert.ok(!excluded.has(file), `${file} is both carried and excluded`);
  }
  for (const [file, reason] of excluded) {
    assert.ok(reason.length > 20, `${file} is excluded without a reason`);
  }
});

test("withdrawn and superseded documents are not offered as opportunities", () => {
  for (const file of [
    "zandfontein-16-july2026.pdf",
    "Notice-withdrawal-Zandfontein-Advert.pdf",
    "readvertisement-for-elandspruit-farm-vers2.pdf",
    "AMENDED-Woolton-Spilsby-Vetted-Re-Advert-22Apr2026.pdf",
  ]) {
    assert.equal(
      FARM_NOTICES.filter((notice) => notice.file === file).length,
      0,
      `${file} must not be carried as a notice`,
    );
  }
});

test("every notice has an identity, an extent, a deadline and a way to ask", () => {
  const ids = new Set<string>();
  for (const notice of FARM_NOTICES) {
    assert.ok(notice.id.length > 0);
    assert.ok(!ids.has(notice.id), `duplicate id ${notice.id}`);
    ids.add(notice.id);
    assert.ok(notice.name.length > 0, `${notice.id} has no name`);
    assert.ok(notice.reference.length > 0, `${notice.id} has no reference`);
    assert.ok(notice.facts.length > 0, `${notice.id} states no facts`);
    assert.ok(
      Number.isFinite(notice.hectares) &&
        notice.hectares > 0 &&
        notice.hectares < 100_000,
      `${notice.id} has an implausible extent`,
    );
    assert.match(notice.closes, ISO_SAST, `${notice.id} deadline is not SAST`);
    assert.ok(
      !Number.isNaN(Date.parse(notice.closes)),
      `${notice.id} deadline does not parse`,
    );
    assert.match(notice.phone, /^0\d{9}$/, `${notice.id} phone`);
    assert.ok(notice.contact.length > 0, `${notice.id} has no contact`);
  }
});

test("a notice sits in a district of its own province, or says it is unconfirmed", () => {
  for (const notice of FARM_NOTICES) {
    const districts = DISTRICTS_BY_PROVINCE[notice.province] ?? [];
    assert.ok(districts.length > 0, `${notice.province} has no districts`);
    if (notice.districtIds) {
      for (const id of notice.districtIds) {
        assert.ok(
          districts.some((district) => district.id === id),
          `${notice.id}: ${id} is not a district of ${notice.province}`,
        );
      }
    }
    const matched = districts.filter((district) =>
      noticeInDistrict(notice, district),
    );
    if (matched.length === 0) {
      // Allowed, and it has to be visible: an unlocated record says so in
      // its district label rather than being quietly grouped somewhere.
      assert.match(
        notice.district,
        /awaiting confirmation|not stated/i,
        `${notice.id} groups into no district but does not say so`,
      );
    }
  }
});

test("coordinates are printed by the notice, inside the country, and declared", () => {
  for (const notice of FARM_NOTICES) {
    if (notice.coordinates === null) continue;
    const [lng, lat] = notice.coordinates;
    assert.equal(
      notice.placedBy,
      "coordinates",
      `${notice.id} carries a point without saying where it came from`,
    );
    assert.ok(lng >= 16 && lng <= 33.1, `${notice.id} longitude ${lng}`);
    assert.ok(lat >= -35.5 && lat <= -21.9, `${notice.id} latitude ${lat}`);
  }
});

test("a weaker placement is always declared", () => {
  for (const notice of FARM_NOTICES) {
    if (!notice.placedBy || notice.placedBy === "notice") continue;
    assert.ok(
      ["municipality", "coordinates", "office"].includes(notice.placedBy),
      `${notice.id} has an unknown placement basis`,
    );
    assert.ok(
      notice.facts.some((fact) =>
        /(names|gives) no|not named|follows? from/i.test(fact),
      ),
      `${notice.id} is placed indirectly without saying so in its facts`,
    );
  }
});

test("the index snapshot still covers every province it claims", () => {
  const provinces = new Set(FARM_NOTICES.map((notice) => notice.province));
  assert.equal(
    provinces.size,
    9,
    `notices reach ${provinces.size} provinces, not 9`,
  );
});
