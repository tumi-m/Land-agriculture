"use client";
import { useState, type CSSProperties } from "react";
import {
  NOTICE_CHECKED,
  NOTICE_INDEX,
  noticeStatus,
  type FarmNotice,
} from "@/content/farm-notices";
import { parcelFor } from "@/lib/cadastre";
import { decimal, plural, sastDate } from "@/lib/format";
import { useMountedNow } from "@/lib/useMountedNow";
export default function GovernmentNotices({
  notices,
  onSelect,
  now: fixedNow,
}: {
  notices: FarmNotice[];
  onSelect: (notice: FarmNotice) => void;
  /**
   * The instant to judge deadlines against. Left out, it is the browser's
   * clock once mounted — which is what keeps the server render free of
   * claims that would disagree with the client. Given, the answer is fixed.
   */
  now?: number;
}) {
  const [filter, setFilter] = useState<"all" | "open" | "past">("all");
  const [query, setQuery] = useState("");
  // Whether a deadline has passed depends on when you look. The page is
  // prerendered and revalidated, so the server's answer can be minutes or
  // days older than the reader's — and a different answer in the HTML than
  // in the first client render is a hydration mismatch, which makes React
  // throw away the whole server-rendered tree and redraw it. That happened
  // every time a deadline crossed between a render and a visit. So nothing
  // here says open or closed until the browser has its own clock; the first
  // paint carries only what is true at any time.
  const mountedNow = useMountedNow();
  const now = fixedNow ?? mountedNow;
  const at = now === null ? null : new Date(now);
  const status = (n: FarmNotice) => (at ? noticeStatus(n, at) : null);
  const open = at
    ? notices.filter((n) => status(n) === "Deadline ahead").length
    : null;
  const visible = notices.filter(
    (n) =>
      (filter === "all" ||
        (status(n) === "Deadline ahead") === (filter === "open")) &&
      `${n.name} ${n.district} ${n.use}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <div className="government-notices">
      <p className="notice-coverage">
        {notices.length
          ? `${notices.length} reviewed ${plural(notices.length, "advert", "adverts")}${
              open === null ? "" : ` · ${open} with a deadline ahead`
            }`
          : "Coverage incomplete for this area"}
      </p>
      <p className="dossier-note">
        Checked {NOTICE_CHECKED}.{" "}
        {notices.length && open === 0
          ? "These deadlines have passed. Ask the listed officer about re-advertising or allocation status."
          : "A future deadline does not confirm current availability. Check with the listed officer."}
      </p>
      {notices.some((n) => n.province === "NC") && (
        <p className="dossier-note">
          Northern Cape review covers the department’s 2026 index, not all
          state-owned land. Aasvogelpan’s district awaits confirmation; Kheis &
          Rooisand spans two districts.
        </p>
      )}
      {notices.length > 0 && (
        <>
          <label className="notice-search">
            Find a farm or enterprise
            <input
              type="search"
              placeholder="Farm, district or crop"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div
            className="notice-status-filters"
            role="group"
            aria-label="Filter notice status"
          >
            {(
              [
                ["all", "All adverts"],
                ["open", "Deadline ahead"],
                ["past", "Past adverts"],
              ] as const
            ).map(([id, name]) => (
              <button
                key={id}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {name}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="anatomy-notices">
        {visible.map((n, i) => (
          <button
            key={n.id}
            className="notice-card"
            // Its place in the list, for the staggered entrance in motion.css.
            style={{ "--i": Math.min(i, 8) } as CSSProperties}
            onClick={() => onSelect(n)}
          >
            {/* Held back until the browser has a clock: see `now` above. */}
            {status(n) && (
              <span className="notice-badge">
                {status(n) === "Closed"
                  ? "Past advert · deadline passed"
                  : "Deadline ahead"}
              </span>
            )}
            <strong>{n.name}</strong>
            <span>
              {n.district} ·{" "}
              {decimal(n.hectares, 1)}{" "}
              ha
            </span>
            <span>{n.use}</span>
            <small>
              Deadline{" "}
              {sastDate(n.closes)}
            </small>
            <span className="notice-action">
              {parcelFor(n.id)
                ? "View parcel & farm details ↗"
                : "Farm details & official contact ↗"}
            </span>
          </button>
        ))}
        {!visible.length && (
          <p>
            {notices.length
              ? "No adverts match this filter. Try All adverts or clear your search."
              : "No notice has been linked here yet. This does not mean no government land exists."}
          </p>
        )}
      </div>
      <a
        className="dossier-source"
        href={NOTICE_INDEX}
        target="_blank"
        rel="noreferrer"
      >
        Check official DLRRD adverts ↗
      </a>
    </div>
  );
}
