export const INFRASTRUCTURE = {
  rivers: {
    name: "Rivers & streams",
    url: "https://services3.arcgis.com/QdLJLZBqzVAhCil8/ArcGIS/rest/services/DWS_Rivers_50k/FeatureServer/0",
    fields: "OBJECTID,Riv_Name,Riv_Class",
    credit: "DWS / NGI · 1:50,000 hydrography",
    updated: "2022-05-25",
    note: "Mapped watercourse, not a measurement of current flow or permission to abstract water.",
  },
  dams: {
    name: "Dams & water bodies",
    url: "https://services3.arcgis.com/QdLJLZBqzVAhCil8/ArcGIS/rest/services/DWS_Dams_50k/FeatureServer/0",
    fields: "OBJECTID,Dam_Name,Dam_Class,Riv_Name,Hectares,Year_OfPUB",
    credit: "DWS / NGI · 1:50,000 hydrography",
    updated: "2024-10-16",
    note: "Mapped water body, not live storage, reliable supply or confirmed water rights.",
  },
  power: {
    name: "Transmission lines",
    url: "https://services8.arcgis.com/ZhTpwEGNVUBxG9VW/arcgis/rest/services/Main_Transmission_System_Lines/FeatureServer/9",
    fields: "OGR_FID,TYPE,VOLTAGE,OHL_DESCRIPTION,STATUS",
    credit: "Eskom · WRC / University of Pretoria Hydropower Atlas",
    updated: "2025-02-26",
    note: "Main transmission network only. Local distribution, farm connections and spare capacity are not shown.",
  },
} as const;
export type InfrastructureKind = keyof typeof INFRASTRUCTURE;
export const INFRA_LAYER_IDS = [
  "local-dams-fill",
  "local-rivers-line",
  "local-power-line",
];
export const EMPTY_FEATURES: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};
export function parseInfrastructureBounds(
  raw: string | null,
): [number, number, number, number] {
  if (!raw || raw.split(",").some((s) => !s.trim()))
    throw new Error("Choose a local map area.");
  const b = raw.split(",").map(Number);
  if (
    b.length !== 4 ||
    !b.every(Number.isFinite) ||
    b[0] < 16 ||
    b[2] > 33 ||
    b[1] < -35.5 ||
    b[3] > -22 ||
    b[0] >= b[2] ||
    b[1] >= b[3] ||
    b[2] - b[0] > 0.6 ||
    b[3] - b[1] > 0.6
  )
    throw new Error("Zoom closer for local infrastructure.");
  return b as [number, number, number, number];
}
export function infrastructureQuery(
  kind: InfrastructureKind,
  bounds: [number, number, number, number],
) {
  const params = new URLSearchParams({
    where: "1=1",
    geometry: bounds.join(","),
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    inSR: "4326",
    outSR: "4326",
    outFields: INFRASTRUCTURE[kind].fields,
    returnGeometry: "true",
    resultRecordCount: "300",
    geometryPrecision: "5",
    maxAllowableOffset: "0.00005",
    f: "geojson",
  });
  return `${INFRASTRUCTURE[kind].url}/query?${params}`;
}
const clean = (value: unknown) =>
  typeof value === "string" && value.trim() && !value.startsWith("#")
    ? value.trim().slice(0, 250)
    : "";
export function parseInfrastructure(
  raw: {
    error?: unknown;
    type?: string;
    features?: unknown[];
    exceededTransferLimit?: boolean;
  },
  kind: InfrastructureKind,
) {
  if (
    raw?.error ||
    raw?.type !== "FeatureCollection" ||
    !Array.isArray(raw.features)
  )
    throw new Error("Map service returned no usable data.");
  const result: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [],
  };
  let vertices = 0,
    limited = !!raw.exceededTransferLimit || raw.features.length >= 300;
  const seen = new Set<string>();
  for (const feature of raw.features.slice(0, 300)) {
    const f = feature as {
      geometry?: { type?: string; coordinates?: unknown };
      properties?: Record<string, unknown>;
      id?: unknown;
    };
    if (
      !f?.geometry ||
      !(
        kind === "dams"
          ? ["Polygon", "MultiPolygon"]
          : ["LineString", "MultiLineString"]
      ).includes(f.geometry.type ?? "")
    )
      continue;
    let count = 0;
    const valid = (coords: unknown): boolean =>
      Array.isArray(coords) &&
      coords.length > 0 &&
      (typeof coords[0] === "number"
        ? ++count < 25000 &&
          coords.length >= 2 &&
          coords.slice(0, 2).every(Number.isFinite) &&
          Math.abs(coords[0]) <= 180 &&
          Math.abs(coords[1]) <= 90
        : coords.every(valid));
    if (!valid(f.geometry.coordinates)) continue;
    if (vertices + count > 30000) {
      limited = true;
      break;
    }
    vertices += count;
    const p = f.properties ?? {};
    const id = `${kind}-${p.OBJECTID ?? p.OGR_FID ?? f.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const name =
      clean(p.Dam_Name) ||
      clean(p.Riv_Name) ||
      clean(p.OHL_DESCRIPTION) ||
      INFRASTRUCTURE[kind].name;
    result.features.push({
      type: "Feature",
      id,
      geometry: f.geometry as GeoJSON.Geometry,
      properties: {
        kind,
        name,
        classification: clean(p.Riv_Class ?? p.Dam_Class ?? p.TYPE),
        status: clean(p.STATUS),
        voltage: typeof p.VOLTAGE === "number" ? p.VOLTAGE : null,
        hectares: typeof p.Hectares === "number" ? p.Hectares : null,
        sourceYear: clean(p.Year_OfPUB),
      },
    });
  }
  return { data: result, limited };
}
