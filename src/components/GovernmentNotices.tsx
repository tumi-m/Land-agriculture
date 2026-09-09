"use client";
import { useState } from "react";
import {
  NOTICE_CHECKED,
  NOTICE_INDEX,
  noticeStatus,
  type FarmNotice,
} from "@/content/farm-notices";
import { parcelFor } from "@/lib/cadastre";
export default function GovernmentNotices({
  notices,
  onSelect,
}: {
  notices: FarmNotice[];
  onSelect: (notice: FarmNotice) => void;
}) {
  const [filter, setFilter] = useState<"all" | "open" | "past">("all");
  const [query, setQuery] = useState("");
  const open = notices.filter(
    (n) => noticeStatus(n) === "Deadline ahead",
  ).length;
  const visible = notices.filter(
    (n) =>
      (filter === "all" ||
        (noticeStatus(n) === "Deadline ahead") === (filter === "open")) &&
      `${n.name} ${n.district} ${n.use}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <div className="government-notices">
      <p className="notice-coverage">
        {notices.length
          ? `${notices.length} reviewed adverts · ${open} with a deadline ahead`
          : "Coverage incomplete for this area"}
      </p>
      <p className="dossier-note">
        Checked {NOTICE_CHECKED}.{" "}
        {notices.length && !open
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
        {visible.map((n) => (
          <button
            key={n.id}
            className="notice-card"
            onClick={() => onSelect(n)}
          >
            <span className="notice-badge">
              {noticeStatus(n) === "Closed"
                ? "Past advert · deadline passed"
                : "Deadline ahead"}
            </span>
            <strong>{n.name}</strong>
            <span>
              {n.district} ·{" "}
              {n.hectares.toLocaleString("en-ZA", { maximumFractionDigits: 1 })}{" "}
              ha
            </span>
            <span>{n.use}</span>
            <small>
              Deadline{" "}
              {new Date(n.closes).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "Africa/Johannesburg",
              })}
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
