/**
 * Search across what the explorer can open: provinces, districts, lease
 * notices, and two things a person may paste in — a 21-character
 * Surveyor-General code (which opens the notice it is matched to), or a pair
 * of coordinates. Everything is local; no query leaves the device.
 *
 * Rivers are not indexed: the six major rivers drawn on the model are
 * context, not something a selection can hold.
 */
import { FARM_NOTICES } from "@/content/farm-notices";
import { PROVINCES, PROVINCE_ORDER } from "@/content/provinces";
import { NOTICE_PARCELS } from "@/lib/cadastre";
import { DISTRICTS } from "@/lib/geo";
import type { ProvinceCode } from "@/lib/types";

export type SearchHit =
  | { kind: "province"; province: ProvinceCode; label: string; detail: string }
  | { kind: "district"; province: ProvinceCode; district: string; label: string; detail: string }
  | { kind: "notice"; id: string; label: string; detail: string }
  | { kind: "point"; lng: number; lat: number; label: string; detail: string };

/** Lower case, no accents, words separated by single spaces. */
export function normalise(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The national extent, as the feeds' validation uses it. */
const inSouthAfrica = (lng: number, lat: number) => lng >= 16 && lng <= 33.1 && lat >= -35.5 && lat <= -21.9;

/**
 * Reads a pasted pair of coordinates in decimal degrees, in either order,
 * with or without hemisphere letters: "-23.84, 30.35", "30.35 -23.84",
 * "23.84 S 30.35 E". South Africa's latitudes are all south and its
 * longitudes all east, so the negative (or S) number is the latitude.
 * Returns "outside" for a well-formed pair that is not in South Africa.
 */
export function parseCoordinates(query: string): { lng: number; lat: number } | "outside" | null {
  const match = query
    .trim()
    .match(/^(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([NSEW])?\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([NSEW])?$/i);
  if (!match) return null;
  const signed = (value: string, hemisphere?: string) => {
    const n = Number(value);
    return hemisphere && /[SW]/i.test(hemisphere) ? -Math.abs(n) : n;
  };
  const a = { value: signed(match[1], match[2]), axis: match[2]?.toUpperCase() };
  const b = { value: signed(match[3], match[4]), axis: match[4]?.toUpperCase() };
  const isLat = (p: typeof a) => p.axis === "N" || p.axis === "S" || (!p.axis && p.value < 0);
  const [lat, lng] = isLat(a) && !isLat(b) ? [a.value, b.value] : isLat(b) && !isLat(a) ? [b.value, a.value] : [a.value, b.value];
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return inSouthAfrica(lng, lat) ? { lng, lat } : "outside";
}

/** A 21-character Surveyor-General code, ignoring spaces, dashes and case. */
export function parseSgCode(query: string): string | null {
  const code = query.replace(/[\s-]/g, "").toUpperCase();
  return /^[A-Z][A-Z0-9]{20}$/.test(code) && /\d{17}$/.test(code) ? code : null;
}

interface Entry {
  hit: SearchHit;
  /** The name, normalised. */
  name: string;
  /** Everything else worth matching: province, district, municipality, use. */
  extra: string;
  /** Breaks ties: places before notices. */
  rank: number;
}

const INDEX: Entry[] = [
  ...PROVINCE_ORDER.map((code) => ({
    hit: { kind: "province" as const, province: code, label: PROVINCES[code].name, detail: "Province" },
    name: normalise(PROVINCES[code].name),
    extra: "",
    rank: 0,
  })),
  ...DISTRICTS.map((d) => ({
    hit: {
      kind: "district" as const,
      province: d.province,
      district: d.id,
      label: d.name,
      detail: `District · ${PROVINCES[d.province].name}`,
    },
    name: normalise(d.name),
    extra: normalise(PROVINCES[d.province].name),
    rank: 1,
  })),
  ...FARM_NOTICES.map((n) => ({
    hit: {
      kind: "notice" as const,
      id: n.id,
      label: n.name,
      detail: `Lease notice · ${n.use} · ${n.district}, ${PROVINCES[n.province].name}`,
    },
    name: normalise(n.name),
    extra: normalise([n.use, n.district, n.municipality, PROVINCES[n.province].name].join(" ")),
    rank: 2,
  })),
];

/**
 * How well `words` (the query, normalised and split) match an entry:
 * every word has to start some word of the entry. A name that is the
 * query scores highest, then a name that starts with it, then a name that
 * contains every word, then a match through the other fields.
 */
function score(entry: Entry, query: string, words: string[]): number {
  const nameWords = entry.name.split(" ");
  const allWords = [...nameWords, ...entry.extra.split(" ")];
  const starts = (pool: string[]) => words.every((w) => pool.some((p) => p.startsWith(w)));
  if (entry.name === query) return 100;
  if (entry.name.startsWith(query)) return 80;
  if (starts(nameWords)) return 60;
  if (starts(allWords)) return 30;
  return 0;
}

export function search(query: string, limit = 8): SearchHit[] {
  // A parcel has no screen of its own; the notice it is matched to does.
  const code = parseSgCode(query);
  if (code) {
    const parcel = NOTICE_PARCELS.features.find((f) => f.properties.cadastralId === code);
    const notice = parcel && FARM_NOTICES.find((n) => n.id === parcel.properties.noticeId);
    return notice
      ? [{ kind: "notice", id: notice.id, label: notice.name, detail: `Lease notice · Surveyor-General code ${code}` }]
      : [];
  }
  const point = parseCoordinates(query);
  if (point && point !== "outside") {
    return [
      {
        kind: "point",
        lng: point.lng,
        lat: point.lat,
        label: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
        detail: "A point · inspect the land there",
      },
    ];
  }
  if (point === "outside") return [];

  const q = normalise(query);
  if (!q) return [];
  const words = q.split(" ");
  return INDEX.map((entry) => ({ entry, s: score(entry, q, words) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s || a.entry.rank - b.entry.rank || a.entry.name.localeCompare(b.entry.name))
    .slice(0, limit)
    .map(({ entry }) => entry.hit);
}

/** What to say when a query finds nothing, so the reader knows why. */
export function emptyMessage(query: string): string {
  if (parseSgCode(query)) return "No reviewed lease notice is matched to that Surveyor-General code.";
  if (parseCoordinates(query) === "outside") return "That point is outside South Africa.";
  return "Nothing matches. Try a province, a district, a farm's name or what it is used for.";
}
