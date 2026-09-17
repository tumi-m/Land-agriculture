import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FARM_NOTICES } from "../src/content/farm-notices";

/**
 * Checks on the generated src/data/district-stats.json. Like the raster
 * tests, these assert structure and relationships rather than exact values:
 * the rasters carry genuine gaps and the boundaries are simplified, but the
 * physics and the provenance rules do not move. Nulls are the documented
 * nodata answer ("Not recorded" downstream); NaN is never acceptable.
 */

interface SourceBlock {
  unit: string;
  source: string;
  date: string;
  method: string;
  licence?: string;
  resolution?: string;
}

interface DistrictStats {
  name: string;
  province: string;
  areaKm2: SourceBlock & { value: number };
  rain: SourceBlock & {
    mean: number | null;
    p10: number | null;
    p90: number | null;
    cells: number;
  };
  landCover: SourceBlock & {
    shares: Record<string, number> | null;
    cells: number;
  };
  soilPh: SourceBlock & { mean: number | null; cells: number };
  soilClay: SourceBlock & {
    meanPercent: number | null;
    meanGPerKg: number | null;
    cells: number;
  };
  elevation: SourceBlock & {
    mean: number;
    min: number;
    max: number;
    cells: number;
  };
  notices: SourceBlock & { count: number };
  parcels: SourceBlock & { count: number };
}

interface StatsFile {
  about: string;
  boundaries: { source: string; date: string; method: string };
  coverage: { source: string; checked: string; scope: string };
  districts: Record<string, DistrictStats>;
}

const BLOCKS = [
  "areaKm2",
  "rain",
  "landCover",
  "soilPh",
  "soilClay",
  "elevation",
  "notices",
  "parcels",
] as const;

const raw = readFileSync("src/data/district-stats.json", "utf8");
const stats = JSON.parse(raw) as StatsFile;
const ids = Object.keys(stats.districts);

test("52 districts, keyed exactly as in the boundary file, no NaN anywhere", () => {
  assert.ok(!raw.includes("NaN"), "the JSON text must never carry NaN");
  assert.equal(ids.length, 52, "expected 52 districts");
  const topo = JSON.parse(
    readFileSync("src/data/sa-districts.topo.json", "utf8"),
  ) as {
    objects: {
      districts: { geometries: { properties: { id: string } }[] };
    };
  };
  const boundaryIds = topo.objects.districts.geometries.map((g) => g.properties.id);
  assert.deepEqual(
    [...ids].sort(),
    [...boundaryIds].sort(),
    "district keys must match the boundary file's ids",
  );
  for (const id of ids) {
    const district = stats.districts[id];
    assert.ok(district.name.length > 0, `${id} has no name`);
    assert.ok(district.province.length > 0, `${id} has no province`);
  }
});

test("every stat block carries a non-empty source, date and unit", () => {
  for (const id of ids) {
    for (const block of BLOCKS) {
      const stat = stats.districts[id][block];
      assert.ok(stat.source.length > 0, `${id}.${block} has no source`);
      assert.ok(stat.date.length > 0, `${id}.${block} has no date`);
      assert.ok(stat.unit.length > 0, `${id}.${block} has no unit`);
      assert.ok(stat.method.length > 0, `${id}.${block} has no method`);
      if (block !== "areaKm2" && block !== "notices" && block !== "parcels") {
        assert.ok(
          (stat.resolution ?? "").length > 0,
          `${id}.${block} is a raster statistic without a resolution`,
        );
      }
    }
  }
});

test("land-cover shares stay inside the legend and sum to 0.98–1.02", () => {
  const legend = (
    JSON.parse(
      readFileSync("public/data/layers/landcover.json", "utf8"),
    ) as { legend: Record<string, string> }
  ).legend;
  for (const id of ids) {
    const { shares, cells } = stats.districts[id].landCover;
    assert.ok(cells > 0, `${id} caught no classified cell`);
    assert.ok(shares !== null, `${id} has no land-cover shares`);
    let sum = 0;
    for (const [code, share] of Object.entries(shares!)) {
      assert.ok(code in legend, `${id} carries class ${code}, which is not in the legend`);
      assert.ok(share >= 0 && share <= 1, `${id} class ${code} share ${share} outside 0–1`);
      sum += share;
    }
    assert.ok(
      sum >= 0.98 && sum <= 1.02,
      `${id} land-cover shares sum to ${sum}, outside 0.98–1.02`,
    );
  }
});

test("values stay inside physical ranges, nulls only as the nodata answer", () => {
  let totalArea = 0;
  for (const id of ids) {
    const d = stats.districts[id];
    assert.ok(Number.isFinite(d.areaKm2.value) && d.areaKm2.value > 0, `${id} area`);
    totalArea += d.areaKm2.value;

    const { mean, p10, p90 } = d.rain;
    if (mean !== null || p10 !== null || p90 !== null) {
      for (const v of [mean, p10, p90]) {
        assert.ok(typeof v === "number" && v >= 0 && v <= 5000, `${id} rain ${v} mm outside 0–5000`);
      }
      assert.ok(p10! <= mean! && mean! <= p90!, `${id} rain percentiles out of order`);
    }

    if (d.soilPh.mean !== null) {
      assert.ok(d.soilPh.mean >= 3 && d.soilPh.mean <= 10, `${id} pH ${d.soilPh.mean} outside 3–10`);
    }
    if (d.soilClay.meanPercent !== null || d.soilClay.meanGPerKg !== null) {
      const percent = d.soilClay.meanPercent!;
      const gPerKg = d.soilClay.meanGPerKg!;
      assert.ok(percent >= 0 && percent <= 100, `${id} clay ${percent}% outside 0–100`);
      assert.ok(gPerKg >= 0 && gPerKg <= 1000, `${id} clay ${gPerKg} g/kg outside 0–1000`);
      assert.ok(Math.abs(gPerKg - percent * 10) <= 0.05, `${id} clay unit conversion disagrees`);
    }

    const e = d.elevation;
    assert.ok(e.cells > 0, `${id} caught no DEM cell`);
    assert.ok(
      e.min >= -500 && e.max <= 3500,
      `${id} elevation ${e.min}..${e.max} m outside −500–3500`,
    );
    assert.ok(e.min <= e.mean && e.mean <= e.max, `${id} elevation mean out of order`);

    assert.ok(Number.isInteger(d.notices.count) && d.notices.count >= 0, `${id} notice count`);
    assert.ok(Number.isInteger(d.parcels.count) && d.parcels.count >= 0, `${id} parcel count`);
  }
  assert.ok(
    totalArea > 1_150_000 && totalArea < 1_300_000,
    `districts sum to ${Math.round(totalArea)} km², not South Africa's roughly 1.22 million`,
  );
});

test("notice and parcel counts match the content files they come from", () => {
  const awaiting = "District awaiting confirmation";
  const expectedNotices = FARM_NOTICES.reduce(
    (sum, notice) =>
      sum + (notice.districtIds?.length ?? (notice.district === awaiting ? 0 : 1)),
    0,
  );
  const counted = ids.reduce((sum, id) => sum + stats.districts[id].notices.count, 0);
  assert.equal(counted, expectedNotices, "notice assignments do not match farm-notices.ts");

  const parcels = JSON.parse(
    readFileSync("src/data/notice-parcels.json", "utf8"),
  ) as { features: unknown[] };
  const mapped = ids.reduce((sum, id) => sum + stats.districts[id].parcels.count, 0);
  assert.equal(mapped, parcels.features.length, "every geocoded parcel must land in a district");

  assert.equal(stats.coverage.source, stats.districts[ids[0]].notices.source);
  assert.equal(stats.coverage.checked, stats.districts[ids[0]].notices.date);
});

test("the dry Kalahari district is drier and more alkaline than the wet Midlands", () => {
  // The district-level echo of the Upington < Pietermaritzburg relations
  // tests/raster.test.ts establishes on the rasters themselves: ZF Mgcawu
  // holds Upington, uMgungundlovu holds Pietermaritzburg.
  const kalahari = stats.districts["zf-mgcawu-district"];
  const midlands = stats.districts["umgungundlovu-district"];
  assert.ok(kalahari && midlands, "both districts must be present");
  assert.ok(kalahari.rain.mean !== null && midlands.rain.mean !== null);
  assert.ok(kalahari.rain.mean < 350, `ZF Mgcawu rain ${kalahari.rain.mean} mm should be under 350`);
  assert.ok(
    kalahari.rain.mean < midlands.rain.mean,
    `ZF Mgcawu ${kalahari.rain.mean} mm should be drier than uMgungundlovu ${midlands.rain.mean} mm`,
  );
  assert.ok(kalahari.soilPh.mean !== null && midlands.soilPh.mean !== null);
  assert.ok(
    kalahari.soilPh.mean > midlands.soilPh.mean,
    `ZF Mgcawu pH ${kalahari.soilPh.mean} should be higher than uMgungundlovu ${midlands.soilPh.mean}`,
  );
});
