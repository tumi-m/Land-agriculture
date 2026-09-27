import assert from "node:assert/strict";
import { test } from "node:test";
import RASTER from "../scripts/data/raster-colors.json";
import STATS from "../src/data/district-stats.json";
import { RASTER_RAMPS, WORLDCOVER } from "../src/design/ramps";
import {
  MIN_SHARE,
  along,
  rampGradient,
  comparedWith,
  districtStats,
  landCover,
  phBand,
  rankBy,
  readPh,
  readRain,
  spread,
} from "../src/lib/district-data";

/**
 * The district card turns the baked statistics into plain claims. These pin
 * the claims to the data: every share is a real share, every rank is a real
 * rank, and a colour on the card is the colour the same class has on the map.
 */

const IDS = Object.keys(STATS.districts);

test("the card's land-cover colours are the raster's, class for class", () => {
  // If these drift, a share on the card and a pixel on the map stop reading
  // as the same thing, and nothing else would notice.
  assert.deepEqual(WORLDCOVER, RASTER.landcover.classes);
});

test("land cover for every district sums to its classified cells", () => {
  for (const id of IDS) {
    const rows = landCover(id);
    if (!rows.length) continue;
    const total = rows.reduce((sum, r) => sum + r.share, 0);
    assert.ok(Math.abs(total - 1) < 0.02, `${id} shares sum to ${total.toFixed(3)}`);
  }
});

test("land cover is largest first, named from the grid's own legend", () => {
  const rows = landCover("alfred-nzo-district");
  assert.equal(rows[0].name, "Grassland");
  assert.ok(rows[0].share > 0.8);
  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i].code === "other") continue;
    assert.ok(rows[i - 1].share >= rows[i].share, "not sorted largest first");
  }
});

test("slivers fold into Other rather than drawing a bar nobody can read", () => {
  // Built-up land in Alfred Nzo is 0.05% of cells: real, but unreadable as a
  // bar. It must land in Other, and Other must be last.
  const rows = landCover("alfred-nzo-district");
  assert.ok(!rows.some((r) => r.code === "50"), "a sliver got its own bar");
  const other = rows.find((r) => r.code === "other");
  assert.ok(other && other.share > 0);
  assert.equal(rows[rows.length - 1].code, "other");
  for (const r of rows) {
    if (r.code !== "other") assert.ok(r.share >= MIN_SHARE);
  }
});

test("an unknown district has no card data, not an invented one", () => {
  assert.equal(districtStats("not-a-district"), null);
  assert.deepEqual(landCover("not-a-district"), []);
  assert.equal(rankBy("not-a-district", readRain), null);
});

test("rainfall ranks run from the wettest district to the driest", () => {
  const [low, high] = spread(readRain) ?? [0, 0];
  const wettest = IDS.find((id) => readRain(STATS.districts[id as keyof typeof STATS.districts]) === high)!;
  const driest = IDS.find((id) => readRain(STATS.districts[id as keyof typeof STATS.districts]) === low)!;
  assert.equal(rankBy(wettest, readRain)?.position, 1);
  assert.equal(rankBy(driest, readRain)?.above, 0);
  assert.equal(rankBy(wettest, readRain)?.of, 52);
});

test("the Kalahari reads drier than most, the Midlands wetter", () => {
  // The same relation tests/district-stats.test.ts establishes on the grids,
  // restated as the sentence the card shows.
  const dry = comparedWith(rankBy("zf-mgcawu-district", readRain), "Wetter");
  const wet = comparedWith(rankBy("umgungundlovu-district", readRain), "Wetter");
  assert.match(dry ?? "", /^Wetter than \d+ of the other 51 districts$/);
  const n = (s: string | null) => Number((s ?? "").match(/than (\d+)/)?.[1]);
  assert.ok(n(dry) < 10, `ZF Mgcawu should be near the bottom: ${dry}`);
  assert.ok(n(wet) > 40, `uMgungundlovu should be near the top: ${wet}`);
});

test("pH bands describe the number and nothing more", () => {
  assert.equal(phBand(5.2), "strongly acidic");
  assert.equal(phBand(6.0), "moderately acidic");
  assert.equal(phBand(7.0), "near neutral");
  assert.equal(phBand(8.0), "moderately alkaline");
  assert.equal(phBand(9.0), "strongly alkaline");
  // Every district's measured pH lands in a band.
  for (const id of IDS) {
    const ph = readPh(STATS.districts[id as keyof typeof STATS.districts]);
    if (ph !== null) assert.ok(phBand(ph).length > 0);
  }
});

test("the card's value ramps are the rasters', stop for stop", () => {
  assert.deepEqual(RASTER_RAMPS.rain, RASTER.rain.ramp);
  assert.deepEqual(RASTER_RAMPS.soilPh, RASTER["soil-ph"].ramp);
  assert.deepEqual(RASTER_RAMPS.soilClay, RASTER["soil-clay"].ramp);
});

test("a ramp gradient places every stop inside the bar", () => {
  const css = rampGradient(RASTER_RAMPS.soilPh, 4, 9);
  assert.match(css, /^linear-gradient\(90deg, /);
  // pH 7 sits at 60% of a 4-9 scale; 3.5 and 10 clamp to the ends.
  assert.match(css, /#ffffbf 60\.0%/);
  assert.match(css, /#d73027 0\.0%/);
  assert.match(css, /#006837 100\.0%/);
});

test("along clamps a value onto its scale", () => {
  assert.equal(along(7, 4, 9), 0.6);
  assert.equal(along(2, 4, 9), 0);
  assert.equal(along(12, 4, 9), 1);
});
