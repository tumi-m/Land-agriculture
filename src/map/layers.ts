/**
 * The map layer registry. Every source and layer the Land view renders is a
 * LayerDef here; components call addMapLayers / setLayerVisibility and never
 * addLayer directly.
 */
import type {
  LayerSpecification,
  Map as LibreMap,
  SourceSpecification,
} from "maplibre-gl";
import RIVERS from "@/data/sa-rivers.json";
import { NOTICE_PARCELS } from "@/lib/cadastre";
import { DISTRICTS_BY_PROVINCE, PROVINCE_SHAPES } from "@/lib/geo";
import { ATLAS } from "@/design/ramps";
import {
  AERIAL_ATTRIBUTION,
  AERIAL_TILES,
} from "@/lib/aerial";

export type LayerGroupId =
  | "base"
  | "land"
  | "water"
  | "government"
  | "imagery";

export interface LayerAttribution {
  text: string;
  url: string;
  licence: string;
  date: string;
}

export interface LayerDef {
  id: string;
  group: LayerGroupId;
  label: string;
  /** One plain sentence on what this layer shows. */
  description: string;
  sources: Record<string, SourceSpecification>;
  /** Layer ids are prefixed with the def id to keep them unique. */
  layers: LayerSpecification[];
  /** Insert before this map layer id; appended when absent. */
  beforeId?: string;
  minzoom?: number;
  defaultOn: boolean;
  attribution: LayerAttribution;
}

export const PROVINCE_ATTRIBUTION: LayerAttribution = {
  text: "Municipal Demarcation Board district boundaries",
  url: "https://demarcation.org.za",
  licence: "Public government data",
  date: "2015 boundaries",
};

const provinceSource: SourceSpecification = {
  type: "geojson",
  data: {
    type: "FeatureCollection",
    features: PROVINCE_SHAPES.map((shape) => ({
      type: "Feature",
      properties: { code: shape.code },
      geometry: shape.geometry,
    })),
  },
};

const districtSource: SourceSpecification = {
  type: "geojson",
  data: {
    type: "FeatureCollection",
    features: PROVINCE_SHAPES.flatMap((province) =>
      DISTRICTS_BY_PROVINCE[province.code].map((shape) => ({
        type: "Feature",
        properties: { id: shape.id, province: province.code },
        geometry: shape.geometry,
      })),
    ),
  },
};

const riverSource: SourceSpecification = {
  type: "geojson",
  data: {
    type: "FeatureCollection",
    features: RIVERS.features.map((feature) => ({
      type: "Feature",
      properties: feature.properties,
      geometry: {
        type: "MultiLineString",
        coordinates: feature.geometry.coordinates,
      },
    })),
  },
};

const parcelSource: SourceSpecification = {
  type: "geojson",
  data: NOTICE_PARCELS,
};

export const LAYER_DEFS: LayerDef[] = [
  {
    id: "provinces",
    group: "land",
    label: "Provinces",
    description:
      "Province outlines used for selection and shading. Shading shows the selected historical measure.",
    sources: { provinces: provinceSource },
    layers: [
      {
        id: "province-fill",
        type: "fill",
        source: "provinces",
        paint: { "fill-color": ATLAS.provinceFill, "fill-opacity": 0 },
      },
      {
        id: "province-borders",
        type: "line",
        source: "provinces",
        paint: {
          "line-color": ATLAS.provinceBorders,
          "line-width": 1.2,
          "line-opacity": 0.5,
          "line-dasharray": [3, 3],
        },
      },
      {
        id: "province-focus",
        type: "line",
        source: "provinces",
        filter: ["==", ["get", "code"], ""],
        paint: { "line-color": ATLAS.provinceFocus, "line-width": 2.5 },
      },
    ],
    beforeId: "aerial",
    defaultOn: true,
    attribution: PROVINCE_ATTRIBUTION,
  },
  {
    id: "districts",
    group: "land",
    label: "Districts",
    description:
      "District municipality boundaries. Tap one inside a selected province to open it.",
    sources: { districts: districtSource },
    layers: [
      {
        id: "district-fill",
        type: "fill",
        source: "districts",
        filter: ["==", ["get", "province"], ""],
        paint: { "fill-color": ATLAS.districtFill, "fill-opacity": 0 },
      },
      {
        id: "district-borders",
        type: "line",
        source: "districts",
        filter: ["==", ["get", "province"], ""],
        paint: {
          "line-color": ATLAS.districtBorders,
          "line-width": 1,
          "line-opacity": 0.45,
        },
      },
      {
        id: "district-focus",
        type: "line",
        source: "districts",
        filter: ["==", ["get", "id"], ""],
        paint: { "line-color": ATLAS.districtFocus, "line-width": 3 },
      },
    ],
    beforeId: "province-fill",
    defaultOn: true,
    attribution: PROVINCE_ATTRIBUTION,
  },
  {
    id: "rivers",
    group: "water",
    label: "Rivers",
    description:
      "Major rivers from Natural Earth 1:50m. A line on a map is not a water right or an irrigation entitlement.",
    sources: { rivers: riverSource },
    layers: [
      {
        id: "rivers",
        type: "line",
        source: "rivers",
        paint: {
          "line-color": ATLAS.rivers,
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1, 10, 2.5],
          "line-opacity": 0.8,
        },
      },
    ],
    beforeId: "province-fill",
    defaultOn: true,
    attribution: {
      text: "Natural Earth rivers and lake centerlines",
      url: "https://www.naturalearthdata.com",
      licence: "Public domain",
      date: "1:50m, 2024 release",
    },
  },
  {
    id: "notice-parcels",
    group: "government",
    label: "Notice parcels",
    description:
      "Cadastral boundaries matched to government lease notices. Only exact Surveyor-General matches are drawn.",
    sources: { "notice-parcels": parcelSource },
    layers: [
      {
        id: "notice-parcel-fill",
        type: "fill",
        source: "notice-parcels",
        paint: { "fill-color": ATLAS.noticeParcelFill, "fill-opacity": 0.28 },
      },
      {
        id: "notice-parcel-line",
        type: "line",
        source: "notice-parcels",
        paint: { "line-color": ATLAS.noticeParcelLine, "line-width": 3 },
      },
    ],
    beforeId: "district-fill",
    defaultOn: true,
    attribution: {
      text: "CSG cadastre via the DFFE portal",
      url: "https://egis.environment.gov.za",
      licence: "Public service; confirm terms before reuse",
      date: "checked 9 Sep 2026",
    },
  },
  {
    id: "aerial",
    group: "imagery",
    label: "NGI aerial",
    description:
      "Chief Directorate: National Geo-spatial Information aerial imagery, from zoom 14.",
    sources: {
      aerial: {
        type: "raster",
        tiles: [AERIAL_TILES],
        tileSize: 256,
        minzoom: 14,
        maxzoom: 19,
        bounds: [16, -35.5, 33, -22],
        attribution: AERIAL_ATTRIBUTION,
      },
    },
    layers: [
      {
        id: "aerial",
        type: "raster",
        source: "aerial",
        minzoom: 14,
        paint: { "raster-opacity": 1, "raster-fade-duration": 350 },
      },
    ],
    defaultOn: false,
    attribution: {
      text: "Chief Directorate: National Geo-spatial Information (NGI)",
      url: "https://www.dffe.gov.za",
      licence: "As documented in src/lib/aerial.ts",
      date: "dates vary, catalogue 2014–2016",
    },
  },
];

/** Map layer id → owning def id, for visibility and lookup. */
export const LAYER_ID_TO_DEF = new Map<string, string>(
  LAYER_DEFS.flatMap((def) => def.layers.map((layer) => [layer.id, def.id])),
);

/** Every map layer id this registry owns. */
export const REGISTRY_LAYER_IDS = LAYER_DEFS.flatMap(
  (def) => def.layers.map((layer) => layer.id),
);

/** Adds every def's sources and layers, in registry order. */
export function addMapLayers(map: LibreMap): void {
  for (const def of LAYER_DEFS) {
    for (const [sourceId, source] of Object.entries(def.sources)) {
      if (!map.getSource(sourceId)) map.addSource(sourceId, source);
    }
    for (const layer of def.layers) {
      if (!map.getLayer(layer.id)) map.addLayer(layer, def.beforeId);
    }
  }
}

/** Switches every map layer owned by a def on or off. */
export function setLayerVisibility(
  map: LibreMap,
  defId: string,
  visible: boolean,
): void {
  const def = LAYER_DEFS.find((entry) => entry.id === defId);
  if (!def) return;
  for (const layer of def.layers) {
    if (map.getLayer(layer.id))
      map.setLayoutProperty(layer.id, "visibility", visible ? "visible" : "none");
  }
}