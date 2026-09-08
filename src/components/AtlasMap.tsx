"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as LibreMap } from "maplibre-gl";
import { PROVINCE_SHAPES } from "@/lib/geo";
import { PROVINCES } from "@/content/provinces";
import rivers from "@/data/sa-rivers.json";
import { provinceBounds, ATLAS_ATTRIBUTION, TILE_BASE } from "@/lib/atlas";
import {
  PROVINCE_VIEWS,
  TERRAIN_EXAGGERATION,
  ELEVATION_TILES,
  ELEVATION_ATTRIBUTION,
  groundElevation,
} from "@/lib/terrain";
import { valueOf, type Metric } from "@/lib/land-metrics";
import { group } from "@/lib/format";
import type { ProvinceCode } from "@/lib/types";

export default function AtlasMap({
  metric,
  selected,
  onSelect,
  onFallback,
}: {
  metric: Metric;
  selected: ProvinceCode | null;
  onSelect: (code: ProvinceCode | null) => void;
  onFallback: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const latest = useRef({ selected, onSelect, flat: false });
  const markers = useRef<
    {
      code: ProvinceCode;
      marker: maplibregl.Marker;
      button: HTMLButtonElement;
    }[]
  >([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [demError, setDemError] = useState(false);
  const [flat, setFlat] = useState(false);
  const [satellite, setSatellite] = useState(true);
  const [dataOverlay, setDataOverlay] = useState(false);
  const [water, setWater] = useState(true);
  const [elevation, setElevation] = useState<number | null>(null);
  latest.current = { selected, onSelect, flat };

  const frame = (duration = 1400) => {
    const instance = map.current;
    if (!instance || !host.current) return;
    const code = latest.current.selected;
    const time = matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : duration;
    if (code) {
      instance.flyTo({
        ...PROVINCE_VIEWS[code],
        zoom:
          PROVINCE_VIEWS[code].zoom -
          (host.current.clientWidth < 500 ? 0.5 : 0),
        bearing: -24,
        pitch: latest.current.flat ? 0 : 62,
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
    try {
      instance = new maplibregl.Map({
        container: host.current,
        center: [30.05, -23.82],
        zoom: 8.5,
        pitch: 62,
        bearing: -24,
        maxPitch: 75,
        minZoom: 3,
        maxZoom: 15,
        maxBounds: [
          [10, -40],
          [42, -16],
        ],
        renderWorldCopies: false,
        attributionControl: false,
        canvasContextAttributes: { antialias: true },
        style: {
          version: 8,
          sources: {
            elevation: {
              type: "raster-dem",
              encoding: "terrarium",
              tiles: [ELEVATION_TILES],
              tileSize: 256,
              maxzoom: 15,
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
              paint: { "raster-opacity": 0 },
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
      setLoaded(true);
      frame(0);
    });
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      markers.current.forEach((item) => item.marker.remove());
      markers.current = [];
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!loaded || !instance) return;
    instance.setFilter("province-focus", [
      "==",
      ["get", "code"],
      selected ?? "",
    ]);
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
  }, [loaded, selected, metric, dataOverlay]);
  useEffect(() => {
    if (loaded) frame();
  }, [loaded, selected]);

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
          aria-pressed={!flat}
          onClick={() => {
            map.current?.easeTo({
              pitch: flat ? 62 : 0,
              bearing: flat ? -24 : 0,
              duration: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? 0
                : 700,
            });
            setFlat(!flat);
          }}
        >
          {flat ? "3D" : "2D"}
        </button>
        <button
          disabled={!loaded}
          onClick={() => frame()}
          aria-label="Reset regional view"
        >
          ⌖
        </button>
      </div>
      <div className="terrain-layers" role="group" aria-label="Map layers">
        <button
          disabled={!loaded}
          aria-pressed={satellite}
          onClick={() => {
            setSatellite(!satellite);
            setTileError(false);
            map.current?.setPaintProperty(
              "satellite",
              "raster-opacity",
              satellite ? 0 : 1,
            );
            map.current?.setPaintProperty(
              "relief",
              "raster-opacity",
              satellite ? 1 : 0,
            );
          }}
        >
          {satellite ? "◉ Satellite" : "◉ Relief"}
        </button>
        <button
          disabled={!loaded}
          aria-pressed={dataOverlay}
          onClick={() => setDataOverlay(!dataOverlay)}
        >
          Land data
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
          Rivers
        </button>
        <button
          disabled={!loaded}
          onClick={() => {
            if (selected) onSelect(null);
            else frame();
          }}
        >
          All South Africa ↗
        </button>
      </div>
      <div className="terrain-readout">
        <span>
          {elevation === null
            ? "Elevation loading"
            : `Centre ≈ ${group(elevation)} m`}
        </span>
        <span>Relief ×{TERRAIN_EXAGGERATION}</span>
        <span className="terrain-gesture">
          Drag to explore · right-drag to orbit
        </span>
      </div>
    </div>
  );
}
