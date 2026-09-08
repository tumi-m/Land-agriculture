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
