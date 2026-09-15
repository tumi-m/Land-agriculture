import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LAYER_DEFS,
  LAYER_ID_TO_DEF,
  REGISTRY_LAYER_IDS,
  addMapLayers,
  setLayerVisibility,
} from "../src/map/layers";

test("addMapLayers adds every registry layer to a fresh map", () => {
  // Regression pin: a beforeId naming a layer defined later in the registry
  // made MapLibre skip every vector layer (it refuses to insert before a
  // missing layer and only fires an error event), which silently emptied the
  // Land view. Nothing may be dropped, and the added order must be registry
  // order — it is the stacking order.
  const added: string[] = [];
  const fake = {
    getSource: () => undefined,
    addSource: () => undefined,
    getLayer: (id: string) => (added.includes(id) ? {} : undefined),
    addLayer: (layer: { id: string }) => {
      added.push(layer.id);
    },
  } as unknown as Parameters<typeof addMapLayers>[0];
  addMapLayers(fake);
  assert.deepEqual(added, REGISTRY_LAYER_IDS);
});

test("the aerial raster stacks under the vector layers", () => {
  // Pre-refactor the aerial layer was inserted before province-fill so the
  // vector overlays draw over the imagery.
  assert.equal(REGISTRY_LAYER_IDS[0], "aerial");
  for (const id of ["province-fill", "district-fill", "notice-parcel-fill"]) {
    assert.ok(
      REGISTRY_LAYER_IDS.indexOf(id) > 0,
      `${id} must come after the aerial raster`,
    );
  }
});

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