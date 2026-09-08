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

const panel = (hasFeed: boolean) =>
  renderToStaticMarkup(
    <ProvincePanel
      code="LP"
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

import { LAND_JOURNEY } from "../src/content/journey";
import {
  JourneyNarration,
  JourneyTimeline,
} from "../src/components/LandJourney";

test("the release chapter explains that February and October are separate rounds", () => {
  const chapter = LAND_JOURNEY.findIndex((step) => step.id === "release");
  const html = renderToStaticMarkup(
    <JourneyNarration
      chapter={chapter}
      onExplore={() => {}}
      onRoute={() => {}}
    />,
  );
  assert.equal(LAND_JOURNEY[chapter].metric, "released");
  assert.match(html, /separate rounds/);
  assert.match(html, /not give a valid completion rate/);
});

test("the journey ends with application preparation and a usable restart", () => {
  const chapter = LAND_JOURNEY.length - 1;
  const html = renderToStaticMarkup(
    <JourneyNarration
      chapter={chapter}
      onExplore={() => {}}
      onRoute={() => {}}
    />,
  );
  const navigation = renderToStaticMarkup(
    <JourneyTimeline chapter={chapter} onChange={() => {}} />,
  );
  assert.match(html, /Build my route/);
  assert.match(navigation, /Start again/);
  assert.equal((navigation.match(/aria-current="step"/g) ?? []).length, 1);
});

import { provinceBounds, atlasPadding } from "../src/lib/atlas";

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

test("map framing reserves desktop panels and releases space on tablet and phone", () => {
  assert.equal(atlasPadding(1440, true, false).left, 130);
  assert.equal(atlasPadding(768, true, false).left, 40);
  assert.equal(atlasPadding(1440, false, true).right, 390);
  assert.equal(atlasPadding(375, false, true).right, 55);
  assert.equal(atlasPadding(768, false, true).right, 55);
});
