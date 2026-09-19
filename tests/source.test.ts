import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FEED_MAX_LISTINGS,
  parseFeed,
  validateListing,
} from "../src/lib/source";

/**
 * The remote feed is untrusted input. These tests pin the two rules that
 * matter most: a record whose identity, province, location or extent cannot
 * be trusted is dropped rather than repaired, and an unstated status never
 * reads as an open application window.
 */

const good = {
  id: "lp-001",
  reference: "LP/2026/001",
  title: "Portion 27 of California 507 LT",
  province: "LP",
  district: "Mopani",
  municipality: "Greater Tzaneen",
  coordinates: [30.352365, -23.839081],
  sizeHa: 21.4154,
  arableHa: 2,
  tenure: "lease-30yr",
  enterprises: ["poultry", "unicorns"],
  status: "open",
  opensOn: "2026-08-01T08:00:00+02:00",
  closesOn: "2026-09-21T16:00:00+02:00",
  summary: "Seven poultry houses on the edge of the irrigation scheme.",
  water: "Borehole; yield not stated",
  soil: "Not stated",
  rainfallMm: 620,
  infrastructure: ["Poultry houses", ""],
  eligibility: ["Smallholder farmers"],
  applicationSteps: [{ title: "Collect Form ALA", detail: "At the office" }],
  contact: { office: "Polokwane PSSC", person: "D.T. Machoga" },
  documents: [{ label: "Notice", url: "https://www.dlrrd.gov.za/notice.pdf" }],
  images: [{ src: "https://example.org/shed.jpg", alt: "Shed", caption: "Shed" }],
  updatedAt: "2026-09-09T10:00:00.000Z",
  verified: true,
  sourceUrl: "https://www.dlrrd.gov.za/index.php",
};

test("a complete record keeps its stated facts and drops unknown enterprises", () => {
  const listing = validateListing(good);
  assert.ok(listing);
  assert.equal(listing?.id, "lp-001");
  assert.equal(listing?.province, "LP");
  assert.deepEqual(listing?.coordinates, [30.352365, -23.839081]);
  assert.equal(listing?.sizeHa, 21.4154);
  assert.equal(listing?.status, "open");
  assert.deepEqual(listing?.enterprises, ["poultry"]);
  assert.deepEqual(listing?.infrastructure, ["Poultry houses"]);
  assert.equal(listing?.verified, true);
});

test("an unstated or unrecognised status stays unknown, never open", () => {
  for (const status of [undefined, null, "", "available", 1, {}]) {
    const listing = validateListing({ ...good, status });
    assert.ok(listing);
    assert.equal(listing?.status, "unknown");
  }
});

test("an unstated tenure stays unknown, never the longest lease", () => {
  const listing = validateListing({ ...good, tenure: undefined });
  assert.ok(listing);
  assert.equal(listing?.tenure, "unknown");
  assert.equal(validateListing({ ...good, tenure: "forever" })?.tenure, "unknown");
  assert.equal(validateListing({ ...good, tenure: "caretaker" })?.tenure, "caretaker");
});

test("identity, province, location and extent are required", () => {
  assert.equal(validateListing({ ...good, id: "" }), null);
  assert.equal(validateListing({ ...good, title: undefined }), null);
  assert.equal(validateListing({ ...good, province: "XX" }), null);
  assert.equal(validateListing({ ...good, coordinates: [30.35] }), null);
  assert.equal(validateListing({ ...good, coordinates: ["30", "-23"] }), null);
  assert.equal(validateListing({ ...good, sizeHa: 0 }), null);
  assert.equal(validateListing({ ...good, sizeHa: -5 }), null);
  assert.equal(validateListing({ ...good, sizeHa: Number.NaN }), null);
  assert.equal(validateListing(null), null);
  assert.equal(validateListing("a farm"), null);
});

test("a point outside South Africa is a mistake, not a farm", () => {
  assert.equal(validateListing({ ...good, coordinates: [0, 0] }), null);
  assert.equal(validateListing({ ...good, coordinates: [-23.84, 30.35] }), null);
  assert.equal(validateListing({ ...good, coordinates: [35, -25] }), null);
  assert.ok(validateListing({ ...good, coordinates: [16.5, -34.8] }));
});

test("only http(s) links survive, so a feed cannot inject a script URL", () => {
  const listing = validateListing({
    ...good,
    sourceUrl: "javascript:alert(1)",
    documents: [
      { label: "Bad", url: "javascript:alert(1)" },
      { label: "Also bad", url: "data:text/html,<script>" },
      { label: "Good", url: "https://example.org/a.pdf" },
    ],
    images: [{ src: "javascript:alert(1)", alt: "x", caption: "x" }],
  });
  assert.ok(listing);
  assert.equal(listing?.sourceUrl, undefined);
  assert.equal(listing?.documents.length, 1);
  assert.equal(listing?.documents[0]?.url, "https://example.org/a.pdf");
  assert.equal(listing?.images[0]?.src, undefined);
});

test("arable hectares cannot exceed the advertised extent", () => {
  const listing = validateListing({ ...good, sizeHa: 10, arableHa: 40 });
  assert.ok(listing);
  assert.equal(listing?.arableHa, 0);
  const within = validateListing({ ...good, sizeHa: 10, arableHa: 4 });
  assert.equal(within?.arableHa, 4);
});

test("unparseable dates read as not stated rather than as a deadline", () => {
  const listing = validateListing({
    ...good,
    closesOn: "next Thursday",
    opensOn: 20260801,
  });
  assert.ok(listing);
  assert.equal(listing?.closesOn, "");
  assert.equal(listing?.opensOn, "");
});

test("the feed body is counted: bad records are rejected, not repaired", () => {
  const parsed = parseFeed({
    revision: "r7",
    updatedAt: "2026-09-19T06:00:00.000Z",
    listings: [good, { ...good, id: "" }, { ...good, coordinates: [0, 0] }, "nope"],
  });
  assert.equal(parsed.listings.length, 1);
  assert.equal(parsed.rejected, 3);
  assert.equal(parsed.revision, "r7");
  assert.equal(parsed.updatedAt, "2026-09-19T06:00:00.000Z");
});

test("a duplicate id keeps the first record and counts the rest", () => {
  const parsed = parseFeed({
    listings: [good, { ...good, title: "Same id, later record" }],
  });
  assert.equal(parsed.listings.length, 1);
  assert.equal(parsed.listings[0].title, good.title);
  assert.equal(parsed.rejected, 1);
});

test("records past the cap are counted, never silently truncated", () => {
  const many = Array.from({ length: FEED_MAX_LISTINGS + 3 }, (_, i) => ({
    ...good,
    id: `lp-${i}`,
  }));
  const parsed = parseFeed({ listings: many });
  assert.equal(parsed.listings.length, FEED_MAX_LISTINGS);
  assert.equal(parsed.rejected, 3);
});

test("a body that is not a feed yields an empty result instead of throwing", () => {
  for (const body of [null, undefined, "", 7, [], { listings: "none" }]) {
    const parsed = parseFeed(body, 1_700_000_000_000);
    assert.equal(parsed.listings.length, 0);
    assert.equal(parsed.rejected, 0);
    assert.equal(parsed.revision, "1700000000000");
    assert.equal(parsed.updatedAt, "2023-11-14T22:13:20.000Z");
  }
});
