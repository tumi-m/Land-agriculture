/**
 * Everything the film says, taken from the app's own content and geometry.
 * No number is typed in here: each is counted or read from the same sources
 * the Land Locator shows, and carries that source and its date, so a frame
 * of the film can be checked the same way a screen of the app can.
 */
import { geoCentroid } from "d3-geo";
import { DISTRICTS, PROVINCE_SHAPES, MAP_HEIGHT, MAP_WIDTH, path, projection } from "@/lib/geo";
import { FARM_NOTICES, NOTICE_CHECKED, NOTICE_INDEX } from "@/content/farm-notices";
import { noticeInDistrict } from "@/lib/exploded-map";
import { STAGES, TOTAL_DAYS } from "@/content/process";
import { CONTENT_REVIEWED } from "@/content/meta";
import STATS from "@/data/district-stats.json";

/** "2026-09-09" → "9 Sep 2026", without the runtime's locale data. */
export function longDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
  return `${d} ${month} ${y}`;
}

export const COUNTS = {
  provinces: PROVINCE_SHAPES.length,
  districts: DISTRICTS.length,
  notices: FARM_NOTICES.length,
};

export const SOURCES = {
  boundaries: `District boundaries: Code for Germany click_that_hood (${STATS.boundaries.date}), names updated to current official names`,
  notices: `DLRRD 2026 state farm lease adverts, reviewed ${longDate(NOTICE_CHECKED)}`,
  noticesUrl: NOTICE_INDEX,
  process: `Approximate stage durations from state land lease policy as summarised in the guide, reviewed ${longDate(CONTENT_REVIEWED)}`,
};

/** The country in the app's own projection, for 2D scenes. */
export const MAP = { width: MAP_WIDTH, height: MAP_HEIGHT };
export const PROVINCE_PATHS = PROVINCE_SHAPES.map((p) => ({
  code: p.code,
  name: p.name,
  d: path(p.geometry) ?? "",
}));

export interface NoticePin {
  district: string;
  /** The notices in this district. A notice spanning two districts is in both. */
  ids: string[];
  x: number;
  y: number;
}

/**
 * One pin per district that has reviewed notices, at the district's centre.
 * A district centre is not a farm location — the film says so on screen.
 * Notices whose district is still awaiting confirmation get no pin, and a
 * notice that spans two districts gets one in each — so notices are counted
 * by id, never by adding up pins.
 */
export const NOTICE_PINS: NoticePin[] = DISTRICTS.map((d) => {
  const ids = FARM_NOTICES.filter((n) => noticeInDistrict(n, d)).map((n) => n.id);
  const [lon, lat] = geoCentroid(d.geometry);
  const [x, y] = projection([lon, lat]) ?? [0, 0];
  return { district: d.name, ids, x, y };
})
  .filter((p) => p.ids.length > 0)
  .sort((a, b) => a.x - b.x);

/** How the notices fall: placed in a district, spanning two, or awaiting one. */
const pinned = new Set(NOTICE_PINS.flatMap((p) => p.ids));
export const NOTICE_PLACEMENT = {
  placed: pinned.size,
  awaiting: FARM_NOTICES.length - pinned.size,
  spanning: FARM_NOTICES.filter((n) => NOTICE_PINS.filter((p) => p.ids.includes(n.id)).length > 1).length,
};

export const PROCESS = {
  stages: STAGES.map((s) => ({ id: s.id, actor: s.actor, name: s.name, days: s.days, duration: s.duration })),
  totalDays: TOTAL_DAYS,
};
