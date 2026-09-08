import { PROVINCES, PROVINCE_ORDER } from "@/content/provinces";
import type { ProvinceCode } from "./types";

export type Metric = "advertised" | "released" | "share";

export const METRICS: {
  id: Metric;
  label: string;
  unit: string;
  note: string;
}[] = [
  {
    id: "advertised",
    label: "Advertised",
    unit: "ha",
    note: "Hectares put out for lease in the October 2020 tranche.",
  },
  {
    id: "released",
    label: "Released",
    unit: "ha",
    note: "Hectares actually handed to producers in February 2020.",
  },
  {
    id: "share",
    label: "State land",
    unit: "%",
    note: "Share of the province’s registered surface that the state already owns.",
  },
];

export function valueOf(code: ProvinceCode, metric: Metric): number | null {
  const p = PROVINCES[code];
  if (metric === "advertised") return p.advertised2020;
  if (metric === "released") return p.released2020;
  return p.stateLandSharePct;
}

/** Unknown values rank after known zeroes. The search matches farming profiles too. */
export function rankProvinces(metric: Metric, query = ""): ProvinceCode[] {
  const term = query.trim().toLowerCase();
  return [...PROVINCE_ORDER]
    .filter((code) =>
      `${PROVINCES[code].name} ${PROVINCES[code].commodities.join(" ")}`
        .toLowerCase()
        .includes(term),
    )
    .sort((a, b) => (valueOf(b, metric) ?? -1) - (valueOf(a, metric) ?? -1));
}
