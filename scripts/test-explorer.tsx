import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { rankProvinces, valueOf, METRICS } from "../src/lib/land-metrics";
import { PROVINCE_ORDER } from "../src/content/provinces";
import ProvincePanel from "../src/components/ProvincePanel";

test("every measure ranks all nine provinces without changing the canonical order", () => {
  const original = [...PROVINCE_ORDER];
  for (const metric of METRICS) {
    const ranked = rankProvinces(metric.id);
    assert.equal(new Set(ranked).size, 9);
    ranked
      .slice(1)
      .forEach((code, index) =>
        assert.ok(
          (valueOf(ranked[index], metric.id) ?? -1) >=
            (valueOf(code, metric.id) ?? -1),
        ),
      );
  }
  assert.deepEqual(PROVINCE_ORDER, original);
  assert.equal(rankProvinces("advertised")[0], "NW");
});

test("search matches full province names and farming commodities, ignoring case and whitespace", () => {
  assert.deepEqual(rankProvinces("advertised", "  limPOpo  "), ["LP"]);
  assert.ok(rankProvinces("advertised", "mango").includes("LP"));
  assert.deepEqual(rankProvinces("share", "no-such-crop"), []);
  assert.equal(rankProvinces("share", "   ").length, 9);
});

test("unknown historical values remain unknown and are not presented as zero", () => {
  for (const code of PROVINCE_ORDER) {
    for (const metric of METRICS) {
      const value = valueOf(code, metric.id);
      assert.ok(value === null || (Number.isFinite(value) && value >= 0));
    }
  }
});

const panel = (hasFeed: boolean, district: string | null = null) =>
  renderToStaticMarkup(
    <ProvincePanel
      code="LP"
      district={district}
      onSelectDistrict={() => {}}
      adverts={[]}
      openIds={new Set()}
      onToggle={() => {}}
      onClose={() => {}}
      onOpenOffices={() => {}}
      hasFeed={hasFeed}
    />,
  );

test("an empty province in a connected feed does not claim the feed is disconnected", () => {
  const html = panel(true);
  assert.match(html, /No adverts are currently included for this province/);
  assert.doesNotMatch(html, /No advert feed is connected/);
});

test("province details distinguish historical rounds and expose the application office without a feed", () => {
  const html = panel(false);
  assert.match(html, /No advert feed is connected/);
  assert.match(html, /October 2020/);
  assert.match(html, /February 2020/);
  assert.match(html, /61 Biccard Street/);
  assert.match(html, /href="tel:/);
});

import { provinceBounds } from "../src/lib/atlas";

test("every province fits within the national geographic extent", () => {
  const national = provinceBounds(null);
  for (const code of PROVINCE_ORDER) {
    const bounds = provinceBounds(code);
    for (const axis of [0, 1]) {
      assert.ok(Number.isFinite(bounds[0][axis]));
      assert.ok(bounds[0][axis] < bounds[1][axis]);
      assert.ok(bounds[0][axis] >= national[0][axis]);
      assert.ok(bounds[1][axis] <= national[1][axis]);
    }
  }
});

import { PROVINCE_VIEWS, groundElevation } from "../src/lib/terrain";

test("regional camera views remain inside their province bounds", () => {
  for (const code of PROVINCE_ORDER) {
    const { center, zoom } = PROVINCE_VIEWS[code];
    const bounds = provinceBounds(code);
    assert.ok(zoom >= 7 && zoom <= 12);
    for (const axis of [0, 1])
      assert.ok(
        center[axis] >= bounds[0][axis] && center[axis] <= bounds[1][axis],
        code,
      );
  }
});

test("elevation readings remove display exaggeration and preserve missing values", () => {
  assert.equal(groundElevation(1600), 1000);
  assert.equal(groundElevation(-160), -100);
  assert.equal(groundElevation(null), null);
  assert.equal(groundElevation(NaN), null);
});

import { districtBounds } from "../src/lib/terrain";
import { DISTRICTS_BY_PROVINCE } from "../src/lib/geo";
test("district framing resolves the chosen boundary and rejects districts from another province", () => {
  const first = DISTRICTS_BY_PROVINCE.LP[0];
  const bounds = districtBounds("LP", first.id);
  assert.ok(
    bounds && bounds[0][0] < bounds[1][0] && bounds[0][1] < bounds[1][1],
  );
  assert.equal(districtBounds("WC", first.id), null);
});

test("district details identify the displayed totals as province-wide", () => {
  const html = panel(false, DISTRICTS_BY_PROVINCE.LP[0].id);
  assert.match(html, /Province-wide figures/);
  assert.match(html, /District-level figures are not available/);
});

import { calculateBudget } from "../src/lib/farm-budget";
import { parseClimate } from "../src/lib/climate";
import { FARM_NOTICES, noticeStatus } from "../src/content/farm-notices";
import { toggleDetailState } from "../src/lib/map-selection";
test("financial scenarios account for marketing, setup once and a non-expense reserve", () => {
  const b = {
    units: 10,
    output: 4,
    price: 4000,
    cycles: 1,
    variable: 8000,
    fixed: 20000,
    capital: 100000,
    reserve: 30000,
    marketing: 10,
  };
  const r = calculateBudget(b)!;
  assert.equal(r.revenue, 160000);
  assert.equal(r.surplus, 44000);
  assert.equal(r.initialCapital, 130000);
  assert.equal(r.yearOneCash, -56000);
  assert.equal(r.fiveYears[4].cumulative, 120000);
  assert.ok(Math.abs(r.breakEvenPrice - 2777.7777778) < 0.01);
  assert.ok(calculateBudget(b, 0.8)!.surplus < r.surplus);
  assert.equal(calculateBudget({ ...b, units: 0 }), null);
  assert.equal(calculateBudget({ ...b, marketing: 100 }), null);
  assert.equal(calculateBudget({ ...b, capital: NaN }), null);
});
test("climate handles missing values, valid zero rainfall and mm/day conversion", () => {
  const p = {
    header: { range: "2001–2020", fill_value: -999 },
    parameters: { T2M: { units: "C" }, PRECTOTCORR: { units: "mm/day" } },
    properties: {
      parameter: {
        T2M: { JAN: 20, ANN: 18 },
        PRECTOTCORR: { JAN: 2, FEB: 0, MAR: -999 },
      },
    },
  };
  const r = parseClimate(p, "https://power.larc.nasa.gov");
  assert.equal(r.months[0].rain, 62);
  assert.equal(r.months[1].rain, 0);
  assert.equal(r.months[2].rain, null);
  assert.equal(r.annualRain, null);
  assert.throws(() => parseClimate({}, ""));
});
test("notice deadlines expire at South African local time and missing boundaries remain unknown", () => {
  const n = FARM_NOTICES[0];
  assert.equal(
    noticeStatus(n, new Date("2026-09-21T13:59:59Z")),
    "Deadline ahead",
  );
  assert.equal(noticeStatus(n, new Date("2026-09-21T14:00:00Z")), "Closed");
  assert.equal(
    new Set(FARM_NOTICES.map((n) => n.id)).size,
    FARM_NOTICES.length,
  );
  assert.ok(FARM_NOTICES.every((n) => n.coordinates === null));
});
test("collapse and reopen retain a reversible detail state", () => {
  assert.equal(toggleDetailState("expanded"), "collapsed");
  assert.equal(toggleDetailState(toggleDetailState("expanded")), "expanded");
});
import { NOTICE_PARCELS, parcelBounds } from "../src/lib/cadastre";
import LandDossier from "../src/components/LandDossier";
test("matched cadastral parcels fit the correct provincial bounds and retain identifiers", () => {
  assert.equal(NOTICE_PARCELS.features.length, 2);
  for (const parcel of NOTICE_PARCELS.features) {
    const notice = FARM_NOTICES.find(
      (n) => n.id === parcel.properties.noticeId,
    )!;
    const bounds = provinceBounds(notice.province);
    const point = parcel.properties.coordinates;
    assert.ok(
      point[0] >= bounds[0][0] &&
        point[0] <= bounds[1][0] &&
        point[1] >= bounds[0][1] &&
        point[1] <= bounds[1][1],
    );
    assert.ok(parcel.properties.cadastralId);
    assert.ok(
      Math.abs(parcel.properties.gisHectares - notice.hectares) /
        notice.hectares <
        0.01,
    );
    assert.ok(parcelBounds(notice.id));
  }
  assert.equal(parcelBounds("unknown"), null);
});
test("farm dossier distinguishes mapped parcels from district-only records", () => {
  const render = (index: number) =>
    renderToStaticMarkup(
      <LandDossier
        notice={FARM_NOTICES[index]}
        point={null}
        onClose={() => {}}
      />,
    );
  assert.match(render(0), /Cadastral parcel matched/);
  assert.match(render(0), /CSG cadastral data/);
  assert.match(render(1), /District location only/);
});
test("poultry upside cannot sell more birds than placed", () => {
  const b = {
    units: 100,
    output: 0.95,
    price: 50,
    cycles: 6,
    variable: 20,
    fixed: 1000,
    capital: 0,
    reserve: 0,
    marketing: 0,
  };
  assert.equal(calculateBudget(b, 1.2, "poultry")!.quantity, 600);
});

import {
  explosionOffset,
  sliceHeight,
  modelDistance,
  spacedLabels,
  noticesForDistrict,
  LAND_LAYERS,
} from "../src/lib/exploded-map";
import ExplodedMap, { makePiece } from "../src/components/ExplodedMap";
import { DISTRICTS_BY_PROVINCE } from "../src/lib/geo";
test("exploded pieces return to their geographic positions and separation stays bounded", () => {
  assert.deepEqual(explosionOffset([20, 10], [0, 0], 0), [0, 0]);
  const [x, z] = explosionOffset([20, 10], [0, 0], 1);
  assert.ok(Math.abs(Math.hypot(x, z) - 14) < 1e-8);
  assert.deepEqual(explosionOffset([0, 0], [0, 0], 1), [0, 0]);
  assert.ok(sliceHeight(3, 1) > sliceHeight(2, 1));
  assert.equal(sliceHeight(0, 1), 0);
});
test("portrait framing gives the country enough horizontal space", () => {
  for (const aspect of [0.36, 0.5, 0.75, 1, 1.6]) {
    const distance = modelDistance(125, aspect);
    const visibleWidth = 2 * distance * Math.tan((38 * Math.PI) / 360) * aspect;
    assert.ok(visibleWidth >= 125, `model cropped at aspect ${aspect}`);
  }
  assert.deepEqual(
    spacedLabels([180, 190, 195, 200], 150, 500),
    [180, 214, 248, 282],
  );
});
test("layer notices match the selected district and never leak to another province", () => {
  const mopani = DISTRICTS_BY_PROVINCE.LP.find((d) =>
    d.name.includes("Mopani"),
  )!;
  assert.equal(noticesForDistrict("LP", mopani.id)[0].id, "california-27");
  assert.equal(noticesForDistrict("EC", mopani.id).length, 0);
});
test("district slice geometry preserves finite positions and a shared geographic frame", () => {
  for (const district of DISTRICTS_BY_PROVINCE.LP) {
    const piece = makePiece(district.id, "LP", district.geometry, true);
    assert.equal(piece.meshes.length, 4);
    assert.ok(piece.size.x > 0 && piece.size.z > 0);
    const positions = piece.meshes[0].geometry.getAttribute("position");
    assert.ok(Array.from(positions.array).every(Number.isFinite));
    assert.deepEqual(
      piece.meshes.map((m) => m.userData.layer),
      LAND_LAYERS.map((l) => l.id),
    );
    const geometries = new Set<any>(),
      materials = new Set<any>();
    piece.group.traverse((o: any) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material) materials.add(o.material);
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  }
});
test("exploded view exposes keyboard selectors, layer controls and truthful data scope", () => {
  const district = DISTRICTS_BY_PROVINCE.LP.find((d) =>
    d.name.includes("Mopani"),
  )!;
  const html = renderToStaticMarkup(
    <ExplodedMap
      selected="LP"
      district={district.id}
      onSelect={() => {}}
      onSelectDistrict={() => {}}
      onNotice={() => {}}
      onTerrain={() => {}}
    />,
  );
  assert.match(html, /Select province to explode/);
  assert.match(html, /Select district to peel/);
  assert.match(html, /Peel layers/);
  assert.match(html, /Reassemble/);
  assert.match(html, /California/);
  assert.match(html, /not measured soil strata/);
});

import GovernmentNotices from "../src/components/GovernmentNotices";
import { noticeCountLabel } from "../src/lib/exploded-map";
import coverage from "../src/content/notice-coverage.json";
test("Northern Cape review retains all fifteen source adverts as expired, with valid source fields", () => {
  const records = FARM_NOTICES.filter((n) => n.province === "NC");
  assert.equal(records.length, 15);
  assert.deepEqual(
    records.map((n) => n.id),
    coverage.northernCapeNoticeIds,
  );
  for (const n of records) {
    assert.equal(noticeStatus(n, new Date("2026-09-09T12:00:00Z")), "Closed");
    assert.ok(coverage.reviewedFiles.includes(n.file));
    assert.ok(n.hectares > 0 && n.contact && /^0\d{9}$/.test(n.phone));
  }
});
test("multi-district advert is discoverable in both districts and remains one provincial record", () => {
  for (const district of ["pixley-ka-seme-district", "zf-mgcawu-district"]) {
    assert.ok(
      noticesForDistrict("NC", district).some((n) => n.id === "kheis-rooisand"),
    );
  }
  assert.equal(FARM_NOTICES.filter((n) => n.id === "kheis-rooisand").length, 1);
  assert.ok(!noticesForDistrict("NC", "frances-baard-district").length);
  assert.equal(noticeCountLabel([]), "Coverage incomplete");
});
test("government land browser exposes expired deadlines and official follow-up instead of claiming availability", () => {
  const html = renderToStaticMarkup(
    <GovernmentNotices
      notices={FARM_NOTICES.filter((n) => n.province === "NC")}
      onSelect={() => {}}
    />,
  );
  assert.match(html, /15 reviewed adverts/);
  assert.match(html, /Past advert · deadline passed/);
  assert.match(html, /re-advertising or allocation status/);
  assert.match(html, /Kheis &amp; Rooisand/);
  assert.match(html, /Check official DLRRD adverts/);
  assert.doesNotMatch(html, /15 available/);
});

import {
  parseInfrastructureBounds,
  parseInfrastructure,
  infrastructureQuery,
} from "../src/lib/infrastructure";
import { terrainBudget } from "../src/lib/terrain-quality";
test("infrastructure requests are restricted to finite, bounded South African viewports", () => {
  const bounds = parseInfrastructureBounds("30.25,-23.95,30.45,-23.75");
  assert.deepEqual(bounds, [30.25, -23.95, 30.45, -23.75]);
  for (const invalid of [
    null,
    "",
    "30,,-23,4",
    "NaN,-24,31,-23",
    "16,-35,33,-22",
    "31,-24,30,-23",
    "0,0,0.1,0.1",
  ])
    assert.throws(() => parseInfrastructureBounds(invalid));
  const url = new URL(infrastructureQuery("power", bounds));
  assert.equal(url.searchParams.get("resultRecordCount"), "300");
  assert.equal(url.searchParams.get("outSR"), "4326");
  assert.ok(url.hostname.endsWith("arcgis.com"));
});
test("local infrastructure preserves facts, rejects malformed geometry, deduplicates and reports limits", () => {
  const feature = {
    type: "Feature",
    id: 42,
    geometry: {
      type: "LineString",
      coordinates: [
        [30, -24],
        [30.1, -24.1],
      ],
    },
    properties: {
      OGR_FID: 42,
      OHL_DESCRIPTION: "Test transmission",
      VOLTAGE: 400,
    },
  };
  const r = parseInfrastructure(
    {
      type: "FeatureCollection",
      features: [
        feature,
        feature,
        { ...feature, geometry: { type: "Point", coordinates: [30, -24] } },
      ],
      exceededTransferLimit: true,
    },
    "power",
  );
  assert.equal(r.data.features.length, 1);
  assert.equal(r.data.features[0].properties?.voltage, 400);
  assert.equal(r.data.features[0].properties?.kind, "power");
  assert.equal(r.limited, true);
  assert.throws(() => parseInfrastructure({ error: { code: 500 } }, "rivers"));
  assert.equal(
    parseInfrastructure({ type: "FeatureCollection", features: [] }, "dams")
      .data.features.length,
    0,
  );
});
test("render budgets cap retina cost and data saver disables 3D terrain", () => {
  assert.equal(terrainBudget("balanced", 390, 3).pixelRatio, 1.5);
  assert.equal(terrainBudget("detail", 390, 3).pixelRatio, 2);
  assert.equal(terrainBudget("economy", 390, 3).pixelRatio, 1);
  assert.equal(terrainBudget("economy", 390, 3).terrain, false);
  assert.equal(terrainBudget("balanced", 1400, 3).tileCache, 128);
});
