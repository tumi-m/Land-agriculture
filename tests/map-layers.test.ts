import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LAYER_DEFS,
  LAYER_ID_TO_DEF,
  REGISTRY_LAYER_IDS,
  setLayerVisibility,
} from "../src/map/layers";

test("registry layer ids are unique and every def carries attribution", () => {
  const ids = REGISTRY_LAYER_IDS;
  assert.equal(new Set(ids).size, ids.length, "duplicate layer ids");
  for (const def of LAYER_DEFS) {
    assert.ok(def.attribution.text, `${def.id} has no attribution text`);
    assert.ok(def.attribution.licence, `${def.id} has no licence`);
    assert.ok(def.attribution.date, `${def.id} has no date`);
    assert.ok(def.description, `${def.id} has no description`);
    for (const layer of def.layers) {
      // layers reference sources owned by the same def
      const sourceId = (layer as { source?: string }).source;
      if (sourceId) {
        assert.ok(
          sourceId in def.sources,
          `${layer.id} references unknown source ${sourceId}`,
        );
      }
    }
  }
});

test("the lookup maps every owned layer id to its def", () => {
  assert.equal(LAYER_ID_TO_DEF.get("province-fill"), "provinces");
  assert.equal(LAYER_ID_TO_DEF.get("aerial"), "aerial");
  assert.equal(LAYER_ID_TO_DEF.size, REGISTRY_LAYER_IDS.length);
});

test("setLayerVisibility skips layers the map does not have", () => {
  const touched: Record<string, unknown> = {};
  const fake = {
    getLayer: (id: string) => (id === "rivers" ? {} : undefined),
    setLayoutProperty: (id: string, _name: string, value: unknown) => {
      touched[id] = value;
    },
  } as unknown as Parameters<typeof setLayerVisibility>[0];
  setLayerVisibility(fake, "rivers", false);
  assert.deepEqual(touched, { rivers: "none" });
});