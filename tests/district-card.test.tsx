import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DistrictLayerCard from "../src/components/explorer/DistrictLayerCard";

/**
 * The card is where the model's slices stop being coloured slabs and start
 * saying something, so what it must never do is show a number without where
 * it came from, or a count-up that screen readers hear digit by digit.
 */

const render = (layer: "land" | "soil" | "climate", district = "alfred-nzo-district") =>
  renderToStaticMarkup(<DistrictLayerCard district={district} layer={layer} />);

test("the land slice names the dominant cover and its share, with the source", () => {
  const html = render("land");
  assert.match(html, /Mostly <strong>grassland<\/strong> — 87% of the district/);
  assert.match(html, /ESA WorldCover 2021 v200 · 2021 · 10 m native/);
  assert.match(html, /CC BY 4.0/);
  // Area from the boundaries, elevation from the DEM, each with its source.
  assert.match(html, /data-value="10740"/);
  assert.match(html, /Mapzen \/ USGS \/ SRTM/);
  assert.match(html, /says nothing about who owns the land/);
});

test("the soil slice gives pH to one fixed place and says where it sits", () => {
  const html = render("soil");
  assert.match(html, /class="dcard-sr">6\.0</);
  assert.match(html, /moderately acidic/);
  assert.match(html, /More alkaline than \d+ of the other 51 districts/);
  assert.match(html, /SoilGrids 2\.0 pH/);
  assert.match(html, /test the soil on the parcel/);
});

test("the climate slice carries the mean, the district's spread and the period", () => {
  const html = render("climate");
  assert.match(html, /class="dcard-sr">782</);
  assert.match(html, /between <b>709<\/b> and <b>844<\/b> mm a year/);
  assert.match(html, /Wetter than \d+ of the other 51 districts/);
  assert.match(html, /CHIRPS v2\.0 annual totals · 1991–2020 average/);
  assert.match(html, /not a right to take water/);
});

test("the moving copy of every figure is hidden from screen readers", () => {
  for (const layer of ["land", "soil", "climate"] as const) {
    const html = render(layer);
    const figures = html.match(/class="dcard-figure"/g)?.length ?? 0;
    const hidden = html.match(/<strong><span aria-hidden="true">/g)?.length ?? 0;
    assert.ok(figures > 0);
    assert.equal(hidden, figures, `${layer}: every figure's animated text is aria-hidden`);
  }
});

test("a district with no baked statistics says so rather than showing zeros", () => {
  const html = render("climate", "no-such-district");
  assert.match(html, /No baked statistics/);
  assert.doesNotMatch(html, /dcard-figure/);
});
