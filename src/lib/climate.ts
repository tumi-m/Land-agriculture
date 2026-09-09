export const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
const DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export interface Climate {
  period: string;
  sourceUrl: string;
  retrievedAt: string;
  months: { name: string; rain: number | null; temperature: number | null }[];
  annualRain: number | null;
  meanTemperature: number | null;
}
export function parseClimate(raw: unknown, sourceUrl: string): Climate {
  const r = raw as {
    header?: { range?: string; fill_value?: number };
    properties?: { parameter?: Record<string, Record<string, number>> };
    parameters?: Record<string, { units: string }>;
  };
  const p = r.properties?.parameter;
  if (
    !p ||
    r.parameters?.PRECTOTCORR?.units !== "mm/day" ||
    r.parameters?.T2M?.units !== "C"
  )
    throw new Error("Unrecognised climate data");
  const valid = (v: unknown) =>
    typeof v === "number" &&
    Number.isFinite(v) &&
    v !== r.header?.fill_value &&
    v !== -999
      ? v
      : null;
  const months = MONTHS.map((name, i) => {
    const rain = valid(p.PRECTOTCORR?.[name]);
    return {
      name,
      rain: rain !== null && rain >= 0 ? Math.round(rain * DAYS[i]) : null,
      temperature: valid(p.T2M?.[name]),
    };
  });
  return {
    period: r.header?.range ?? "Period not supplied",
    sourceUrl,
    retrievedAt: new Date().toISOString(),
    months,
    annualRain: months.every((m) => m.rain !== null)
      ? months.reduce((s, m) => s + m.rain!, 0)
      : null,
    meanTemperature: valid(p.T2M?.ANN),
  };
}
