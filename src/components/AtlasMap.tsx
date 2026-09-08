"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as LibreMap, GeoJSONSource } from "maplibre-gl";
import { PROVINCE_SHAPES } from "@/lib/geo";
import { PROVINCES } from "@/content/provinces";
import {
  atlasPadding,
  provinceBounds,
  ATLAS_ATTRIBUTION,
  TILE_BASE,
} from "@/lib/atlas";
import { valueOf, type Metric } from "@/lib/land-metrics";
import { group } from "@/lib/format";
import type { ProvinceCode } from "@/lib/types";

export default function AtlasMap({
  metric,
  selected,
  narrationOverlay,
  onSelect,
  onFallback,
}: {
  metric: Metric;
  selected: ProvinceCode | null;
  narrationOverlay: boolean;
  onSelect: (code: ProvinceCode | null) => void;
  onFallback: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const latest = useRef({ metric, selected, narrationOverlay, onSelect });
  latest.current = { metric, selected, narrationOverlay, onSelect };
  const markers = useRef<
    {
      code: ProvinceCode;
      marker: maplibregl.Marker;
      button: HTMLButtonElement;
      value: HTMLSpanElement;
    }[]
  >([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [satellite, setSatellite] = useState(true);
  const [tilted, setTilted] = useState(false);

  const declutter = () => {
    const occupied: DOMRect[] = [];
    markers.current.forEach(({ button }) =>
      button.classList.remove("is-compact"),
    );
    [...markers.current]
      .sort(
        (a, b) =>
          (valueOf(b.code, latest.current.metric) ?? -1) -
          (valueOf(a.code, latest.current.metric) ?? -1),
      )
      .forEach(({ button }) => {
        if (button.hidden) return;
        const rect = button.getBoundingClientRect();
        const overlaps = occupied.some(
          (other) =>
            rect.left < other.right + 5 &&
            rect.right > other.left - 5 &&
            rect.top < other.bottom + 5 &&
            rect.bottom > other.top - 5,
        );
        if (overlaps && !button.classList.contains("is-active"))
          button.classList.add("is-compact");
        else occupied.push(rect);
      });
  };

  const frame = (duration = 850) => {
    const instance = map.current;
    if (!instance || !host.current) return;
    const { selected: code, narrationOverlay: guided } = latest.current;
    const width = host.current.clientWidth;
    const padding = atlasPadding(window.innerWidth, guided, !!code);
    // In free exploration the map is narrower than the page because of the province index.
    if (width < 600) {
      padding.left = 25;
      padding.right = 25;
      padding.bottom = 110;
    }
    instance.fitBounds(provinceBounds(code), {
      padding,
      duration: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : duration,
      maxZoom: code ? 7.3 : 5.1,
    });
  };

  useEffect(() => {
    if (!host.current) return;
    let instance: LibreMap;
    try {
      instance = new maplibregl.Map({
        container: host.current,
        center: [25, -29],
        zoom: 4.5,
        minZoom: 3,
        maxZoom: 12,
        maxBounds: [
          [8, -40],
          [43, -15],
        ],
        renderWorldCopies: false,
        attributionControl: false,
        canvasContextAttributes: { antialias: true },
        style: {
          version: 8,
          sources: {
            satellite: {
              type: "raster",
              tiles: [`${TILE_BASE}s2cloudless_3857/default/g/{z}/{y}/{x}.jpg`],
              tileSize: 256,
              maxzoom: 14,
              attribution: ATLAS_ATTRIBUTION,
            },
            terrain: {
              type: "raster",
              tiles: [`${TILE_BASE}terrain_3857/default/g/{z}/{y}/{x}.jpg`],
              tileSize: 256,
              maxzoom: 13,
            },
          },
          layers: [
            {
              id: "paper",
              type: "background",
              paint: { "background-color": "#ddd8b7" },
            },
            {
              id: "terrain",
              type: "raster",
              source: "terrain",
              paint: { "raster-opacity": 0, "raster-saturation": -0.35 },
            },
            {
              id: "satellite",
              type: "raster",
              source: "satellite",
              paint: {
                "raster-opacity": 0.68,
                "raster-saturation": -0.55,
                "raster-contrast": -0.12,
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
      new maplibregl.ScaleControl({ maxWidth: 100 }),
      "bottom-left",
    );
    instance.on("error", (event) => {
      if (
        "sourceId" in event &&
        (event.sourceId === "satellite" || event.sourceId === "terrain")
      )
        setTileError(true);
    });
    instance.on("moveend", declutter);
    instance.on("load", () => {
      instance.addSource("provinces", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: PROVINCE_SHAPES.map((shape) => ({
            type: "Feature",
            properties: {
              code: shape.code,
              value: valueOf(shape.code, latest.current.metric) ?? 0,
            },
            geometry: shape.geometry,
          })),
        },
      });
      instance.addLayer({
        id: "province-fill",
        type: "fill",
        source: "provinces",
        paint: { "fill-color": "#7d8c48", "fill-opacity": 0.15 },
      });
      instance.addLayer({
        id: "province-borders",
        type: "line",
        source: "provinces",
        paint: {
          "line-color": "#514d32",
          "line-width": 1,
          "line-opacity": 0.5,
          "line-dasharray": [4, 3],
        },
      });
      instance.addLayer({
        id: "province-focus",
        type: "line",
        source: "provinces",
        filter: ["==", ["get", "code"], ""],
        paint: { "line-color": "#98432b", "line-width": 2.5 },
      });
      instance.on("click", "province-fill", (event) => {
        const code = event.features?.[0]?.properties?.code as
          ProvinceCode | undefined;
        if (code) latest.current.onSelect(code);
      });
      instance.on("mouseenter", "province-fill", () => {
        instance.getCanvas().style.cursor = "pointer";
      });
      instance.on("mouseleave", "province-fill", () => {
        instance.getCanvas().style.cursor = "";
      });
      markers.current = PROVINCE_SHAPES.map((shape) => {
        const bounds = provinceBounds(shape.code);
        const center: [number, number] = [
          (bounds[0][0] + bounds[1][0]) / 2,
          (bounds[0][1] + bounds[1][1]) / 2,
        ];
        const button = document.createElement("button");
        button.type = "button";
        button.className = "atlas-pin";
        const name = document.createElement("span");
        name.textContent = shape.name;
        const value = document.createElement("span");
        value.className = "atlas-pin-value";
        button.append(name, value);
        button.title = shape.name;
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          latest.current.onSelect(shape.code);
        });
        const marker = new maplibregl.Marker({
          element: button,
          anchor: "center",
        })
          .setLngLat(center)
          .addTo(instance);
        return { code: shape.code, marker, button, value };
      });
      setLoaded(true);
      frame(0);
    });
    let resizeTimer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      instance.resize();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => frame(0), 120);
    });
    observer.observe(host.current);
    return () => {
      clearTimeout(resizeTimer);
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
    (instance.getSource("provinces") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: PROVINCE_SHAPES.map((shape) => ({
        type: "Feature",
        properties: {
          code: shape.code,
          value: valueOf(shape.code, metric) ?? 0,
        },
        geometry: shape.geometry,
      })),
    });
    const maximum = Math.max(
      ...PROVINCE_SHAPES.map((shape) => valueOf(shape.code, metric) ?? 0),
      1,
    );
    instance.setPaintProperty("province-fill", "fill-opacity", [
      "interpolate",
      ["linear"],
      ["get", "value"],
      0,
      0.04,
      maximum,
      0.3,
    ]);
    instance.setFilter("province-focus", [
      "==",
      ["get", "code"],
      selected ?? "",
    ]);
    markers.current.forEach(({ code, button, value }) => {
      const n = valueOf(code, metric);
      value.textContent =
        n === null
          ? "Not recorded"
          : `${group(n)}${metric === "share" ? "%" : " ha"}`;
      button.classList.toggle("is-active", selected === code);
      button.hidden = !!selected && selected !== code;
      button.setAttribute(
        "aria-label",
        `${PROVINCES[code].name}: ${value.textContent}. Explore province`,
      );
    });
    declutter();
  }, [loaded, metric, selected]);

  useEffect(() => {
    if (loaded) frame();
  }, [loaded, selected, narrationOverlay]);

  return (
    <div className="atlas-map">
      <div
        ref={host}
        className="atlas-canvas"
        aria-label="Geographic agricultural land map of South Africa"
      />
      {!loaded && !failed && (
        <p className="atlas-loading">Opening the agricultural atlas…</p>
      )}
      {failed && (
        <div className="atlas-fallback">
          <p>The geographic map could not start on this device.</p>
          <button className="btn" onClick={onFallback}>
            Use province data instead
          </button>
        </div>
      )}
      {tileError && loaded && (
        <div className="atlas-tile-note" role="status">
          Some imagery could not load. Province boundaries and figures remain
          available.
        </div>
      )}
      <div
        className="atlas-tools"
        role="group"
        aria-label="Geographic map controls"
      >
        <button
          type="button"
          disabled={!loaded}
          onClick={() => map.current?.zoomIn()}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          disabled={!loaded}
          onClick={() => map.current?.zoomOut()}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          disabled={!loaded}
          onClick={() => {
            map.current?.easeTo({ bearing: 0, pitch: 0, duration: 0 });
            setTilted(false);
            frame();
          }}
          aria-label="Reset map orientation and framing"
        >
          N ↑
        </button>
        <button
          type="button"
          disabled={!loaded}
          aria-pressed={tilted}
          onClick={() => {
            map.current?.easeTo({
              pitch: tilted ? 0 : 45,
              duration: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? 0
                : 500,
            });
            setTilted(!tilted);
          }}
        >
          {tilted ? "Flat" : "Tilt"}
        </button>
        <button
          type="button"
          disabled={!loaded}
          onClick={() => {
            const next = !satellite;
            setSatellite(next);
            setTileError(false);
            map.current?.setPaintProperty(
              "satellite",
              "raster-opacity",
              next ? 0.68 : 0,
            );
            map.current?.setPaintProperty(
              "terrain",
              "raster-opacity",
              next ? 0 : 0.85,
            );
          }}
        >
          {satellite ? "Terrain" : "Satellite"}
        </button>
      </div>
    </div>
  );
}
