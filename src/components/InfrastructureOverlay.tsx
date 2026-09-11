"use client";
import { useEffect, useState } from "react";
import type {
  Map as LibreMap,
  GeoJSONSource,
  MapMouseEvent,
} from "maplibre-gl";
import {
  INFRASTRUCTURE,
  INFRA_LAYER_IDS,
  EMPTY_FEATURES,
  parseInfrastructureBounds,
  type InfrastructureKind,
} from "@/lib/infrastructure";
export function infrastructureHit(
  map: LibreMap,
  point: MapMouseEvent["point"],
) {
  const layers = INFRA_LAYER_IDS.filter((id) => map.getLayer(id));
  return layers.length
    ? map.queryRenderedFeatures(
        [
          [point.x - 5, point.y - 5],
          [point.x + 5, point.y + 5],
        ],
        { layers },
      )[0]
    : undefined;
}
export default function InfrastructureOverlay({
  map,
  water,
  power,
  paused,
  retry,
  onSelect,
  onStatus,
}: {
  map: LibreMap;
  water: boolean;
  power: boolean;
  paused: boolean;
  retry: number;
  onSelect: () => void;
  onStatus: (status: string) => void;
}) {
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    let stopped = false,
      timer: ReturnType<typeof setTimeout>,
      controller: AbortController | null = null,
      generation = 0;
    const kinds: InfrastructureKind[] = ["rivers", "dams", "power"];
    for (const kind of kinds)
      map.addSource(`local-${kind}`, {
        type: "geojson",
        data: EMPTY_FEATURES,
        attribution: INFRASTRUCTURE[kind].credit,
        tolerance: 0.5,
      });
    map.addLayer({
      id: "local-dams-fill",
      type: "fill",
      source: "local-dams",
      paint: {
        "fill-color": "#35bedb",
        "fill-opacity": 0.48,
        "fill-outline-color": "#b0f3ff",
      },
    });
    map.addLayer({
      id: "local-rivers-line",
      type: "line",
      source: "local-rivers",
      paint: {
        "line-color": [
          "match",
          ["get", "classification"],
          "Perennial",
          "#65e2fc",
          "#b3cddb",
        ],
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 15, 3],
      },
    });
    map.addLayer({
      id: "local-power-line",
      type: "line",
      source: "local-power",
      paint: {
        "line-color": "#ffd36b",
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2, 15, 4],
        "line-dasharray": [3, 1],
      },
    });
    const choose = (e: MapMouseEvent) => {
      const f = infrastructureHit(map, e.point);
      if (f) {
        setSelected(f.properties);
        onSelect();
      }
    };
    map.on("click", choose);
    const refresh = () => {
      clearTimeout(timer);
      controller?.abort();
      const request = ++generation;
      const clear = () =>
        kinds.forEach((k) =>
          (map.getSource(`local-${k}`) as GeoJSONSource)?.setData(
            EMPTY_FEATURES,
          ),
        );
      if (paused) {
        clear();
        onStatus("Save data · local features paused");
        return;
      }
      if (!water && !power) {
        clear();
        onStatus("Local infrastructure layers off");
        return;
      }
      const b = map.getBounds();
      let bounds: [number, number, number, number];
      try {
        if (map.getZoom() < 11) throw new Error();
        const values = [
          Math.floor(b.getWest() * 500) / 500,
          Math.floor(b.getSouth() * 500) / 500,
          Math.ceil(b.getEast() * 500) / 500,
          Math.ceil(b.getNorth() * 500) / 500,
        ];
        bounds = parseInfrastructureBounds(values.join(","));
      } catch {
        clear();
        onStatus("Zoom closer for rivers, dams & power lines");
        return;
      }
      onStatus("Loading local infrastructure…");
      timer = setTimeout(async () => {
        controller = new AbortController();
        const signal = controller.signal;
        let count = 0,
          failures = 0,
          limited = false;
        const active = kinds.filter((k) => (k === "power" ? power : water));
        await Promise.allSettled(
          active.map(async (kind) => {
            try {
              const response = await fetch(
                `/api/infrastructure?layer=${kind}&bbox=${bounds.join(",")}`,
                { signal },
              );
              const body = await response.json();
              if (!response.ok) throw new Error();
              if (stopped || request !== generation || signal.aborted) return;
              (map.getSource(`local-${kind}`) as GeoJSONSource)?.setData(
                body.data,
              );
              count += body.data.features.length;
              limited ||= body.limited;
            } catch {
              if (!signal.aborted) failures++;
            }
          }),
        );
        if (!stopped && request === generation && !signal.aborted)
          onStatus(
            failures
              ? `${count} local features · ${failures} source${failures === 1 ? "" : "s"} unavailable; retry in Map layers`
              : limited
                ? `${count} local features · partial coverage, zoom closer`
                : count
                  ? `${count} mapped local features · tap to inspect`
                  : "No features returned here · source coverage may be incomplete",
          );
      }, 650);
    };
    map.on("moveend", refresh);
    refresh();
    return () => {
      stopped = true;
      generation++;
      clearTimeout(timer);
      controller?.abort();
      map.off("moveend", refresh);
      map.off("click", choose);
      if (map.getStyle()) {
        for (const id of INFRA_LAYER_IDS)
          if (map.getLayer(id)) map.removeLayer(id);
        for (const kind of kinds)
          if (map.getSource(`local-${kind}`)) map.removeSource(`local-${kind}`);
      }
    };
  }, [map, water, power, paused, retry, onSelect, onStatus]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selected) {
        event.stopImmediatePropagation();
        setSelected(null);
      }
    };
    window.addEventListener("keydown", close, true);
    return () => window.removeEventListener("keydown", close, true);
  }, [selected]);
  useEffect(() => {
    if (selected && (paused || (selected.kind === "power" ? !power : !water)))
      setSelected(null);
  }, [paused, power, water, selected]);
  const source = selected
    ? INFRASTRUCTURE[selected.kind as InfrastructureKind]
    : null;
  return (
    <>
      {selected && source && (
        <aside
          className="infrastructure-card"
          aria-label="Selected infrastructure"
        >
          <div className="infrastructure-card-head">
            <strong>{String(selected.name ?? "")}</strong>
            <button
              onClick={() => setSelected(null)}
              aria-label="Close infrastructure information"
            >
              Close ×
            </button>
          </div>
          <p>
            {source.name}
            {selected.classification
              ? ` · ${String(selected.classification)}`
              : ""}
          </p>
          {selected.voltage !== null && selected.voltage !== undefined && (
            <p>
              Recorded voltage: {String(selected.voltage)} (source units
              unspecified)
            </p>
          )}
          {selected.hectares !== null && selected.hectares !== undefined && (
            <p>
              Mapped area:{" "}
              {Number(selected.hectares).toLocaleString("en-ZA", {
                maximumFractionDigits: 2,
              })}{" "}
              ha
            </p>
          )}
          {typeof selected.status === "string" && selected.status !== "" && (
            <p>Recorded status: {selected.status}</p>
          )}
          <p>{source.note}</p>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.credit} ↗
          </a>
          <small>
            Dataset updated {source.updated}.{" "}
            {selected.sourceYear
              ? `Source map year ${String(selected.sourceYear)}.`
              : ""}{" "}
            Not live conditions.
          </small>
        </aside>
      )}
    </>
  );
}
