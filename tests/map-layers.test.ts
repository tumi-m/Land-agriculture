import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LAYER_DEFS,
  LAYER_ID_TO_DEF,
  LOCAL_INFRASTRUCTURE_DEFS,
  REGISTRY_LAYER_IDS,
  addLayerDefs,
  addMapLayers,
  removeLayerDefs,
  setLayerVisibility,
} from "../src/map/layers";
import { INFRA_LAYER_IDS } from "../src/lib/infrastructure";

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
/** A map that remembers what was added, enough for the registry's calls. */
function fakeMap() {
  const layers: string[] = [];
  const sources: string[] = [];
  return {
    layers,
    sources,
    map: {
      getSource: (id: string) => (sources.includes(id) ? {} : undefined),
      addSource: (id: string) => {
        sources.push(id);
      },
      removeSource: (id: string) => {
        sources.splice(sources.indexOf(id), 1);
      },
      getLayer: (id: string) => (layers.includes(id) ? {} : undefined),
      addLayer: (layer: { id: string }) => {
        layers.push(layer.id);
      },
      removeLayer: (id: string) => {
        layers.splice(layers.indexOf(id), 1);
      },
    } as unknown as Parameters<typeof addLayerDefs>[0],
  };
}

test("the local infrastructure defs carry exactly the layers the overlay hit-tests", () => {
  // These specs used to be inline in InfrastructureOverlay. The overlay still
  // queries INFRA_LAYER_IDS to decide what a tap hit, so if the registry ever
  // renames or drops one of them the tap goes dead with nothing else failing.
  const ids = LOCAL_INFRASTRUCTURE_DEFS.flatMap((def) =>
    def.layers.map((layer) => layer.id),
  );
  assert.deepEqual([...ids].sort(), [...INFRA_LAYER_IDS].sort());
});

test("each local layer reads from a source the same def declares", () => {
  for (const def of LOCAL_INFRASTRUCTURE_DEFS) {
    for (const layer of def.layers) {
      const source = (layer as { source?: string }).source;
      assert.ok(
        source && source in def.sources,
        `${layer.id} reads from ${source}, which its def does not declare`,
      );
    }
  }
});

test("the local defs are not in the base registry, and do not collide with it", () => {
  // They are added on mount and removed on unmount, so addMapLayers must not
  // draw them; their ids must still be unique against everything it does.
  const base = new Set(REGISTRY_LAYER_IDS);
  for (const id of INFRA_LAYER_IDS) {
    assert.ok(!base.has(id), `${id} is in the base registry as well`);
  }
});

test("adding and removing the local defs is idempotent and leaves nothing behind", () => {
  const { layers, sources, map } = fakeMap();
  addLayerDefs(map, LOCAL_INFRASTRUCTURE_DEFS);
  const afterFirst = [...layers];
  assert.deepEqual(afterFirst, [
    "local-dams-fill",
    "local-rivers-line",
    "local-power-line",
  ]);

  // A remount must not double-add: MapLibre throws on a duplicate layer id.
  addLayerDefs(map, LOCAL_INFRASTRUCTURE_DEFS);
  assert.deepEqual(layers, afterFirst);

  removeLayerDefs(map, LOCAL_INFRASTRUCTURE_DEFS);
  assert.deepEqual(layers, []);
  assert.deepEqual(sources, []);

  // And removing twice is safe, which is what a torn-down style looks like.
  removeLayerDefs(map, LOCAL_INFRASTRUCTURE_DEFS);
  assert.deepEqual(layers, []);
});

test("dams draw under rivers and power, as they did inline", () => {
  // Stacking order is the order the overlay added them: fill first, so the
  // lines stay readable over the water bodies.
  const { layers, map } = fakeMap();
  addLayerDefs(map, LOCAL_INFRASTRUCTURE_DEFS);
  assert.ok(
    layers.indexOf("local-dams-fill") < layers.indexOf("local-rivers-line"),
    "the dam fill must be added before the river lines",
  );
});
