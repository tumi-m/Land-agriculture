"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import InfrastructureOverlay, {
  infrastructureHit,
} from "./InfrastructureOverlay";
import {
  AERIAL_TILES,
  AERIAL_ATTRIBUTION,
  AERIAL_CATALOGUE,
} from "@/lib/aerial";
import { terrainBudget, type TerrainQuality } from "@/lib/terrain-quality";
import type { Map as LibreMap } from "maplibre-gl";
import { NOTICE_PARCELS, parcelFor, parcelBounds } from "@/lib/cadastre";
import { noticeInDistrict, noticeCountLabel } from "@/lib/exploded-map";
import { geoCentroid } from "d3-geo";
import { FARM_NOTICES, type FarmNotice } from "@/content/farm-notices";
import type { MapInspection } from "@/lib/map-selection";
import { PROVINCE_SHAPES, DISTRICTS_BY_PROVINCE, DISTRICTS } from "@/lib/geo";
import { PROVINCES } from "@/content/provinces";
import rivers from "@/data/sa-rivers.json";
import { provinceBounds, ATLAS_ATTRIBUTION, TILE_BASE } from "@/lib/atlas";
import {
  PROVINCE_VIEWS,
  TERRAIN_EXAGGERATION,
  ELEVATION_TILES,
  ELEVATION_ATTRIBUTION,
  groundElevation,
  districtBounds,
} from "@/lib/terrain";
import { valueOf, type Metric } from "@/lib/land-metrics";
import { group } from "@/lib/format";
import type { ProvinceCode } from "@/lib/types";

export default function AtlasMap({
  notice,
  inspection,
  onInspect,
  onSelectNotice,
  metric,
  selected,
  district,
  onSelectDistrict,
  onSelect,
  onFallback,
  onInspectInfrastructure,
}: {
  notice: FarmNotice | null;
  inspection: MapInspection | null;
  onInspect: (point: MapInspection) => void;
  onSelectNotice: (notice: FarmNotice) => void;
  metric: Metric;
  selected: ProvinceCode | null;
  district: string | null;
  onSelectDistrict: (id: string | null) => void;
  onSelect: (code: ProvinceCode | null) => void;
  onFallback: () => void;
  onInspectInfrastructure: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const latest = useRef({
    notice,
    onInspect,
    onSelectNotice,
    selected,
    district,
    onSelectDistrict,
    onSelect,
    flat: false,
  });
  const markers = useRef<
    {
      code: ProvinceCode;
      marker: maplibregl.Marker;
      button: HTMLButtonElement;
    }[]
  >([]);
  const farmMarkers = useRef<maplibregl.Marker[]>([]);
  const pointMarker = useRef<maplibregl.Marker | null>(null);
  const [inspectMode, setInspectMode] = useState(true);
  const inspectModeRef = useRef(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [demError, setDemError] = useState(false);
  const [flat, setFlat] = useState(false);
  const [satellite, setSatellite] = useState(true);
  const [aerial, setAerial] = useState(false);
  const [aerialState, setAerialState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [dataOverlay, setDataOverlay] = useState(false);
  const [water, setWater] = useState(true);
  const [power, setPower] = useState(true);
  const [quality, setQuality] = useState<TerrainQuality>("balanced");
  const [layersOpen, setLayersOpen] = useState(false);
  const [infraStatus, setInfraStatus] = useState(
    "Zoom closer for rivers, dams & power lines",
  );
  const [infraRetry, setInfraRetry] = useState(0);
  const selectInfrastructure = useCallback(() => {
    setLayersOpen(false);
    onInspectInfrastructure();
  }, [onInspectInfrastructure]);
  const [elevation, setElevation] = useState<number | null>(null);
  latest.current = {
    notice,
    onInspect,
    onSelectNotice,
    selected,
    district,
    onSelectDistrict,
    onSelect,
    flat: flat || quality === "economy",
  };

  const frame = (duration = 1400) => {
    const instance = map.current;
    if (!instance || !host.current) return;
    const code = latest.current.selected;
    const time = matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : duration;
    const noticeDistrict = latest.current.notice
      ? DISTRICTS.find(
          (d) =>
            d.province === latest.current.notice!.province &&
            noticeInDistrict(latest.current.notice!, d),
        )
      : null;
    const parcelExtent = latest.current.notice
      ? parcelBounds(latest.current.notice.id)
      : null;
    const extent =
      parcelExtent ??
      (noticeDistrict
        ? districtBounds(noticeDistrict.province, noticeDistrict.id)
        : code && latest.current.district
          ? districtBounds(code, latest.current.district)
          : null);
    if (extent) {
      instance.fitBounds(extent, {
        padding: { top: 90, bottom: 110, left: 30, right: 65 },
        pitch: latest.current.flat ? 0 : 50,
        bearing: -24,
        maxZoom: parcelExtent ? 14.5 : 11,
        duration: time,
      });
    } else if (code) {
      instance.flyTo({
        ...PROVINCE_VIEWS[code],
        zoom:
          PROVINCE_VIEWS[code].zoom -
          (host.current.clientWidth < 500 ? 0.5 : 0),
        bearing: -24,
        pitch: latest.current.flat ? 0 : 50,
        duration: time,
      });
    } else {
      instance.fitBounds(provinceBounds(null), {
        padding: { top: 65, bottom: 90, left: 25, right: 25 },
        pitch: latest.current.flat ? 0 : 38,
        bearing: 0,
        duration: time,
      });
    }
  };

  useEffect(() => {
    if (!host.current) return;
    let instance: LibreMap;
    const saver = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    const initialQuality: TerrainQuality =
      saver?.saveData || saver?.effectiveType === "2g" ? "economy" : "balanced";
    setQuality(initialQuality);
    const budget = terrainBudget(
      initialQuality,
      host.current.clientWidth,
      devicePixelRatio,
    );
    try {
      instance = new maplibregl.Map({
        container: host.current,
        center: [30.05, -23.82],
        zoom: 8.5,
        pitch: budget.terrain ? 50 : 0,
        bearing: -24,
        maxPitch: budget.maxPitch,
        pixelRatio: budget.pixelRatio,
        maxTileCacheSize: budget.tileCache,
        minZoom: 3,
        maxZoom: 19,
        maxBounds: [
          [10, -40],
          [42, -16],
        ],
        renderWorldCopies: false,
        attributionControl: false,
        canvasContextAttributes: { antialias: false },
        style: {
          version: 8,
          sources: {
            elevation: {
              type: "raster-dem",
              encoding: "terrarium",
              tiles: [ELEVATION_TILES],
              tileSize: 256,
              maxzoom: 13,
              attribution: ELEVATION_ATTRIBUTION,
            },
            satellite: {
              type: "raster",
              tiles: [`${TILE_BASE}s2cloudless_3857/default/g/{z}/{y}/{x}.jpg`],
              tileSize: 256,
              maxzoom: 14,
              attribution: ATLAS_ATTRIBUTION,
            },
            relief: {
              type: "raster",
              tiles: [`${TILE_BASE}terrain_3857/default/g/{z}/{y}/{x}.jpg`],
              tileSize: 256,
              maxzoom: 13,
            },
          },
          layers: [
            {
              id: "base",
              type: "background",
              paint: { "background-color": "#162c32" },
            },
            {
              id: "relief",
              type: "raster",
              source: "relief",
              layout: { visibility: "none" },
              paint: { "raster-opacity": 1 },
            },
            {
              id: "satellite",
              type: "raster",
              source: "satellite",
              paint: {
                "raster-opacity": 1,
                "raster-saturation": 0.08,
                "raster-contrast": 0.12,
              },
            },
          ],
        },
      });
    } catch {
      setFailed(true);
      return;
    }
    map.current = instance;
    instance.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    instance.addControl(
      new maplibregl.ScaleControl({ maxWidth: 85 }),
      "bottom-left",
    );
    instance.on("error", (event) => {
      if ("sourceId" in event) {
        if (event.sourceId === "aerial") setAerialState("error");
        if (event.sourceId === "elevation") setDemError(true);
        if (event.sourceId === "satellite" || event.sourceId === "relief")
          setTileError(true);
      }
    });
    const syncLabels = () => {
      const code = latest.current.selected;
      for (const item of markers.current)
        item.button.hidden = !!code || instance.getZoom() > 7.1;
      const value = instance.isSourceLoaded("elevation")
        ? instance.queryTerrainElevation(instance.getCenter())
        : null;
      setElevation(groundElevation(value));
    };
    instance.on("moveend", syncLabels);
    instance.on("idle", syncLabels);
    instance.on("load", () => {
      instance.setSourceTileLodParams(4, 2);
      if (budget.terrain)
        instance.setTerrain({
          source: "elevation",
          exaggeration: TERRAIN_EXAGGERATION,
        });
      instance.setSky({
        "sky-color": "#b4d8ed",
        "horizon-color": "#e7ede2",
        "fog-color": "#d4e5df",
        "fog-ground-blend": 0.6,
        "horizon-fog-blend": 0.7,
        "sky-horizon-blend": 0.65,
      });
      instance.addSource("provinces", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: PROVINCE_SHAPES.map((shape) => ({
            type: "Feature",
            properties: { code: shape.code },
            geometry: shape.geometry,
          })),
        },
      });
      instance.addLayer({
        id: "province-fill",
        type: "fill",
        source: "provinces",
        paint: { "fill-color": "#5bdbad", "fill-opacity": 0 },
      });
      instance.addLayer({
        id: "province-borders",
        type: "line",
        source: "provinces",
        paint: {
          "line-color": "#f4f8df",
          "line-width": 1.2,
          "line-opacity": 0.5,
          "line-dasharray": [3, 3],
        },
      });
      instance.addLayer({
        id: "province-focus",
        type: "line",
        source: "provinces",
        filter: ["==", ["get", "code"], ""],
        paint: { "line-color": "#b8f6d9", "line-width": 2.5 },
      });
      instance.addSource("districts", {
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
      });
      instance.addLayer({
        id: "district-fill",
        type: "fill",
        source: "districts",
        filter: ["==", ["get", "province"], ""],
        paint: { "fill-color": "#d6f7ac", "fill-opacity": 0 },
      });
      instance.addLayer({
        id: "district-borders",
        type: "line",
        source: "districts",
        filter: ["==", ["get", "province"], ""],
        paint: {
          "line-color": "#e1ffde",
          "line-width": 1,
          "line-opacity": 0.45,
        },
      });
      instance.addLayer({
        id: "district-focus",
        type: "line",
        source: "districts",
        filter: ["==", ["get", "id"], ""],
        paint: { "line-color": "#f9ec9f", "line-width": 3 },
      });
      instance.on("click", "district-fill", (event) => {
        if (
          infrastructureHit(instance, event.point) ||
          inspectModeRef.current ||
          instance.queryRenderedFeatures(event.point, {
            layers: ["notice-parcel-fill"],
          }).length
        )
          return;
        const id = event.features?.[0]?.properties?.id as string | undefined;
        if (id) latest.current.onSelectDistrict(id);
      });
      instance.addSource("rivers", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: rivers.features.map((feature) => ({
            type: "Feature",
            properties: feature.properties,
            geometry: {
              type: "MultiLineString",
              coordinates: feature.geometry.coordinates,
            },
          })),
        },
      });
      instance.addLayer({
        id: "rivers",
        type: "line",
        source: "rivers",
        paint: {
          "line-color": "#73cce1",
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1, 10, 2.5],
          "line-opacity": 0.8,
        },
      });
      instance.on("click", "province-fill", (event) => {
        if (
          infrastructureHit(instance, event.point) ||
          inspectModeRef.current ||
          instance.queryRenderedFeatures(event.point, {
            layers: ["notice-parcel-fill"],
          }).length
        )
          return;
        const code = event.features?.[0]?.properties?.code as
          ProvinceCode | undefined;
        if (code && code !== latest.current.selected)
          latest.current.onSelect(code);
      });
      markers.current = PROVINCE_SHAPES.map((shape) => {
        const bounds = provinceBounds(shape.code);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "terrain-pin";
        button.textContent = shape.name;
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          latest.current.onSelect(shape.code);
        });
        const marker = new maplibregl.Marker({ element: button })
          .setLngLat([
            (bounds[0][0] + bounds[1][0]) / 2,
            (bounds[0][1] + bounds[1][1]) / 2,
          ])
          .addTo(instance);
        return { code: shape.code, marker, button };
      });
      instance.addSource("notice-parcels", {
        type: "geojson",
        data: NOTICE_PARCELS,
      });
      instance.addLayer({
        id: "notice-parcel-fill",
        type: "fill",
        source: "notice-parcels",
        paint: { "fill-color": "#d5ef86", "fill-opacity": 0.28 },
      });
      instance.addLayer({
        id: "notice-parcel-line",
        type: "line",
        source: "notice-parcels",
        paint: { "line-color": "#e9ff8c", "line-width": 3 },
      });
      instance.on("click", "notice-parcel-fill", (event) => {
        if (infrastructureHit(instance, event.point)) return;
        const item = FARM_NOTICES.find(
          (n) => n.id === event.features?.[0]?.properties?.noticeId,
        );
        if (item) latest.current.onSelectNotice(item);
      });
      for (const parcel of NOTICE_PARCELS.features) {
        const item = FARM_NOTICES.find(
          (n) => n.id === parcel.properties.noticeId,
        )!;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "farm-parcel-pin";
        button.textContent = `${item.name} · ${item.hectares.toFixed(1)} ha`;
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          latest.current.onSelectNotice(item);
        });
        farmMarkers.current.push(
          new maplibregl.Marker({ element: button })
            .setLngLat(parcel.properties.coordinates)
            .addTo(instance),
        );
      }
      for (const shape of DISTRICTS) {
        const notices = FARM_NOTICES.filter(
          (n) => !parcelFor(n.id) && noticeInDistrict(n, shape),
        );
        if (!notices.length) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "farm-area-pin";
        button.textContent = `${shape.name} · ${noticeCountLabel(notices)}`;
        button.title =
          "District notice group — farm positions not yet verified";
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          latest.current.onSelectNotice(notices[0]);
        });
        farmMarkers.current.push(
          new maplibregl.Marker({ element: button })
            .setLngLat(geoCentroid(shape.geometry))
            .addTo(instance),
        );
      }
      instance.on("click", (event) => {
        if (infrastructureHit(instance, event.point)) return;
        if (
          instance.queryRenderedFeatures(event.point, {
            layers: ["notice-parcel-fill"],
          }).length
        )
          return;
        if (
          !inspectModeRef.current ||
          !instance.queryRenderedFeatures(event.point, {
            layers: ["province-fill"],
          }).length
        )
          return;
        const coordinates: [number, number] = [
          event.lngLat.lng,
          event.lngLat.lat,
        ];
        if (
          coordinates[0] < 16 ||
          coordinates[0] > 33 ||
          coordinates[1] < -35 ||
          coordinates[1] > -22
        )
          return;
        latest.current.onInspect({
          coordinates,
          elevation: groundElevation(
            instance.queryTerrainElevation(event.lngLat),
          ),
        });
      });
      setLoaded(true);
      frame(0);
    });
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      markers.current.forEach((item) => item.marker.remove());
      markers.current = [];
      farmMarkers.current.forEach((m) => m.remove());
      farmMarkers.current = [];
      pointMarker.current?.remove();
      pointMarker.current = null;
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!loaded || !instance || !host.current) return;
    const budget = terrainBudget(
      quality,
      host.current.clientWidth,
      devicePixelRatio,
    );
    instance.setPixelRatio(budget.pixelRatio);
    instance.setMaxPitch(budget.maxPitch);
    instance.setTerrain(
      quality === "economy" || flat
        ? null
        : { source: "elevation", exaggeration: TERRAIN_EXAGGERATION },
    );
    if (quality === "economy" || flat) {
      instance.easeTo({ pitch: 0, duration: 0 });
      setElevation(null);
    }
  }, [quality, flat, loaded]);
  useEffect(() => {
    const instance = map.current;
    if (!loaded || !instance) return;
    const visible = aerial && satellite && quality !== "economy";
    if (visible && !instance.getSource("aerial")) {
      instance.addSource("aerial", {
        type: "raster",
        tiles: [AERIAL_TILES],
        tileSize: 256,
        minzoom: 14,
        maxzoom: 19,
        bounds: [16, -35.5, 33, -22],
        attribution: AERIAL_ATTRIBUTION,
      });
      instance.addLayer(
        {
          id: "aerial",
          type: "raster",
          source: "aerial",
          minzoom: 14,
          paint: { "raster-opacity": 1, "raster-fade-duration": 350 },
        },
        "province-fill",
      );
      instance.setSourceTileLodParams(4, 1.5, "aerial");
    }
    if (instance.getLayer("aerial"))
      instance.setLayoutProperty(
        "aerial",
        "visibility",
        visible ? "visible" : "none",
      );
    if (!visible) return;
    setAerialState("loading");
    const sourceLoaded = (event: maplibregl.MapSourceDataEvent) => {
      if (event.sourceId === "aerial" && instance.isSourceLoaded("aerial"))
        setAerialState("ready");
    };
    instance.on("sourcedata", sourceLoaded);
    if (instance.isSourceLoaded("aerial")) setAerialState("ready");
    return () => {
      instance.off("sourcedata", sourceLoaded);
    };
  }, [aerial, satellite, quality, loaded]);
  const openAerial = () => {
    if (!loaded) return;
    setAerial(true);
    setSatellite(true);
    setQuality("balanced");
    setFlat(false);
    setLayersOpen(false);
    map.current?.setLayoutProperty("satellite", "visibility", "visible");
    map.current?.setLayoutProperty("relief", "visibility", "none");
    map.current?.easeTo({
      zoom: Math.max(16, map.current.getZoom()),
      pitch: 45,
      duration: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 900,
    });
  };
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape" && layersOpen) {
        e.stopImmediatePropagation();
        setLayersOpen(false);
      }
    };
    window.addEventListener("keydown", close, true);
    return () => window.removeEventListener("keydown", close, true);
  }, [layersOpen]);
  useEffect(() => {
    const instance = map.current;
    if (!loaded || !instance) return;
    instance.setFilter("province-focus", [
      "==",
      ["get", "code"],
      selected ?? "",
    ]);
    instance.setFilter("district-fill", [
      "==",
      ["get", "province"],
      selected ?? "",
    ]);
    instance.setFilter("district-borders", [
      "==",
      ["get", "province"],
      selected ?? "",
    ]);
    instance.setFilter("district-focus", ["==", ["get", "id"], district ?? ""]);
    const maximum = Math.max(
      ...PROVINCE_SHAPES.map((shape) => valueOf(shape.code, metric) ?? 0),
      1,
    );
    const opacity: maplibregl.ExpressionSpecification = [
      "match",
      ["get", "code"],
      PROVINCE_SHAPES[0].code,
      0.05 + ((valueOf(PROVINCE_SHAPES[0].code, metric) ?? 0) / maximum) * 0.4,
      ...PROVINCE_SHAPES.slice(1).flatMap((shape) => [
        shape.code,
        0.05 + ((valueOf(shape.code, metric) ?? 0) / maximum) * 0.4,
      ]),
      0,
    ];
    instance.setPaintProperty(
      "province-fill",
      "fill-opacity",
      dataOverlay ? opacity : 0,
    );
    markers.current.forEach((item) => {
      const value = valueOf(item.code, metric);
      item.button.setAttribute(
        "aria-label",
        `${PROVINCES[item.code].name}, ${value === null ? "not recorded" : group(value)} ${metric === "share" ? "percent" : "hectares"}. Explore terrain`,
      );
    });
  }, [loaded, selected, district, metric, dataOverlay]);
  useEffect(() => {
    if (loaded) frame();
  }, [loaded, selected, district, notice]);
  useEffect(() => {
    pointMarker.current?.remove();
    pointMarker.current = null;
    if (!loaded || !map.current || !inspection) return;
    const element = document.createElement("div");
    element.className = "inspection-pin";
    element.setAttribute("aria-label", "Selected analysis point");
    pointMarker.current = new maplibregl.Marker({ element })
      .setLngLat(inspection.coordinates)
      .addTo(map.current);
  }, [loaded, inspection]);

  return (
    <div className="terrain-map">
      <div
        ref={host}
        className="terrain-canvas"
        aria-label="Interactive 3D terrain map of South Africa"
      />
      {!loaded && !failed && (
        <div className="terrain-loading">
          <span className="terrain-spinner" />
          <strong>Bringing the landscape into view</strong>
          <span>Satellite imagery + real elevation</span>
        </div>
      )}
      {failed && (
        <div className="atlas-fallback">
          <p>The terrain map could not start on this device.</p>
          <button className="btn" onClick={onFallback}>
            Open the province comparison
          </button>
        </div>
      )}
      {(tileError || demError) && loaded && (
        <p className="terrain-notice" role="status">
          {demError
            ? "Some elevation tiles could not load; relief may be incomplete."
            : "Some map imagery could not load. Try the relief layer."}
        </p>
      )}
      <div className="terrain-place">
        <span className="terrain-live-dot" />
        <div>
          <strong>
            {selected ? PROVINCES[selected].name : "South Africa"}
          </strong>
          <span>
            {selected
              ? PROVINCES[selected].commodities.slice(0, 3).join(" · ")
              : "Choose a province to explore its landscape"}
          </span>
        </div>
      </div>
      <div
        className="terrain-navigation"
        role="group"
        aria-label="3D terrain navigation"
      >
        <button
          disabled={!loaded}
          onClick={() => map.current?.zoomIn()}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          disabled={!loaded}
          onClick={() => map.current?.zoomOut()}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          disabled={!loaded}
          onClick={() =>
            map.current?.rotateTo((map.current?.getBearing() ?? 0) - 30)
          }
          aria-label="Rotate left"
        >
          ↶
        </button>
        <button
          disabled={!loaded}
          onClick={() =>
            map.current?.rotateTo((map.current?.getBearing() ?? 0) + 30)
          }
          aria-label="Rotate right"
        >
          ↷
        </button>
        <button
          disabled={!loaded}
          aria-pressed={!flat && quality !== "economy"}
          onClick={() => {
            const enable3D = flat || quality === "economy";
            map.current?.easeTo({
              pitch: enable3D ? 50 : 0,
              bearing: enable3D ? -24 : 0,
              duration: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? 0
                : 700,
            });
            if (enable3D && quality === "economy") setQuality("balanced");
            setFlat(!enable3D);
          }}
        >
          {flat || quality === "economy" ? "3D" : "2D"}
        </button>
        <button
          disabled={!loaded}
          onClick={() => frame()}
          aria-label="Reset regional view"
        >
          ⌖
        </button>
      </div>
      <div className="map-inspection-toggle">
        <button
          aria-pressed={inspectMode}
          onClick={() => {
            inspectModeRef.current = !inspectMode;
            setInspectMode(!inspectMode);
          }}
        >
          {inspectMode ? "⌖ Click to inspect" : "↗ Click districts"}
        </button>
        <span>
          {inspectMode
            ? "Climate · elevation · farming scenarios"
            : "Select a region to explore"}
        </span>
      </div>
      <div className="terrain-detail-status" role="status">
        {aerial && satellite && quality !== "economy" && (
          <span className="aerial-status">
            {aerialState === "error"
              ? "Some aerial tiles unavailable · overview remains underneath"
              : aerialState === "loading"
                ? "Loading aerial detail over the overview…"
                : "NGI aerial imagery · historical, dates vary"}
          </span>
        )}
        {infraStatus}
      </div>
      <button
        className="terrain-layers-toggle"
        aria-expanded={layersOpen}
        aria-controls="terrain-layer-sheet"
        onClick={() => setLayersOpen(!layersOpen)}
      >
        {layersOpen ? "Close map layers ×" : "Map layers & detail"}
      </button>
      <button
        className="terrain-aerial-toggle"
        disabled={!loaded}
        aria-pressed={aerial && satellite && quality !== "economy"}
        onClick={() =>
          aerial && satellite && quality !== "economy"
            ? setAerial(false)
            : openAerial()
        }
      >
        {aerial && satellite && quality !== "economy"
          ? "Aerial on · turn off"
          : "Aerial close-up ↗"}
      </button>
      {layersOpen && (
        <section
          className="terrain-layer-sheet"
          id="terrain-layer-sheet"
          aria-label="Map layers and performance"
        >
          <div className="infrastructure-card-head">
            <strong>Map layers & detail</strong>
            <button onClick={() => setLayersOpen(false)}>Close ×</button>
          </div>
          <label>
            Rendering quality
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as TerrainQuality)}
            >
              <option value="balanced">Balanced · recommended</option>
              <option value="detail">Sharper display</option>
              <option value="economy">Save data · 2D</option>
            </select>
          </label>
          <p>
            Start with ≈10 m satellite imagery. Aerial close-up loads much finer
            NGI photography only near your selected location. Terrain relief
            remains typically ≈30 m.
          </p>
          <a href={AERIAL_CATALOGUE} target="_blank" rel="noreferrer">
            Aerial source & dates ↗
          </a>
          <small>
            The catalogue describes 2014–2016 imagery; the local capture date is
            unverified. Coverage and sharpness vary. This is photography draped
            over terrain, not a 3D building survey.
          </small>
          <div className="terrain-layer-options">
            <button
              disabled={!loaded}
              aria-pressed={satellite}
              onClick={() => {
                setSatellite(!satellite);
                setTileError(false);
                map.current?.setLayoutProperty(
                  "satellite",
                  "visibility",
                  satellite ? "none" : "visible",
                );
                map.current?.setLayoutProperty(
                  "relief",
                  "visibility",
                  satellite ? "visible" : "none",
                );
              }}
            >
              {satellite ? "Satellite imagery" : "Relief basemap"}
            </button>
            <button
              disabled={!loaded}
              aria-pressed={water}
              onClick={() => {
                setWater(!water);
                map.current?.setLayoutProperty(
                  "rivers",
                  "visibility",
                  water ? "none" : "visible",
                );
              }}
            >
              Rivers & dams
            </button>
            <button
              disabled={!loaded}
              aria-pressed={power}
              onClick={() => setPower(!power)}
            >
              Transmission lines
            </button>
            <button
              disabled={!loaded}
              aria-pressed={dataOverlay}
              onClick={() => setDataOverlay(!dataOverlay)}
            >
              Historical land totals
            </button>
          </div>
          <p>
            Local water and electricity features load as you zoom closer. Gold
            dashes show transmission; blue shows mapped water.
          </p>
          <button
            className="terrain-local-zoom"
            onClick={() => {
              if (quality === "economy") setQuality("balanced");
              setFlat(false);
              map.current?.easeTo({
                zoom: Math.max(12, map.current?.getZoom() ?? 12),
                pitch: 50,
                duration: 700,
              });
              setLayersOpen(false);
            }}
          >
            Explore nearby detail ↗
          </button>
          <button onClick={() => setInfraRetry((n) => n + 1)}>
            Retry local features
          </button>
          <small>
            Mapped lines do not establish a farm connection. Water features do
            not establish water rights or current supply.
          </small>
        </section>
      )}
      {loaded && map.current && (
        <InfrastructureOverlay
          map={map.current}
          water={water}
          power={power}
          paused={quality === "economy"}
          retry={infraRetry}
          onSelect={selectInfrastructure}
          onStatus={setInfraStatus}
        />
      )}
      <div className="terrain-readout">
        <span>
          {quality === "economy" || flat
            ? "Elevation off in 2D"
            : elevation === null
              ? "Elevation loading"
              : `Centre ≈ ${group(elevation)} m`}
        </span>
        <span>
          {quality === "economy" || flat
            ? "2D · terrain off"
            : `Relief ×${TERRAIN_EXAGGERATION}`}
        </span>
        <span className="terrain-gesture">
          Drag to explore · right-drag to orbit
        </span>
      </div>
    </div>
  );
}
