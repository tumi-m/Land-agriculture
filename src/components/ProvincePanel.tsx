"use client";

import ParcelCard from "./ParcelCard";
import { DISTRICTS_BY_PROVINCE } from "@/lib/geo";
import { PROVINCES } from "@/content/provinces";
import { cx, group } from "@/lib/format";
import type { Listing, ProvinceCode } from "@/lib/types";

/**
 * Slides over the map when a province is opened, and cascades in: each block
 * arrives just behind the last, in the same order the districts fly apart.
 */
export default function ProvincePanel({
  code,
  district,
  onSelectDistrict,
  adverts,
  openIds,
  onToggle,
  onClose,
  onOpenOffices,
  hasFeed,
}: {
  hasFeed: boolean;
  code: ProvinceCode;
  district: string | null;
  onSelectDistrict: (id: string | null) => void;
  adverts: Listing[];
  openIds: Set<string>;
  onToggle: (id: string) => void;
  onClose: () => void;
  onOpenOffices: () => void;
}) {
  const p = PROVINCES[code];
  const districts = DISTRICTS_BY_PROVINCE[code];
  const picked = district ? districts.find((d) => d.id === district) : null;

  // One shared rhythm for the cascade.
  const step = (i: number) => ({ animationDelay: `${120 + i * 70}ms` });

  return (
    <aside
      aria-label={`${p.name} detail`}
      className="pointer-events-auto flex h-full w-full flex-col border-t border-ink bg-paper/95 backdrop-blur-md sm:border-l sm:border-t-0 sm:border-l-rule"
    >
      <div className="flex items-start justify-between gap-4 border-b border-ink px-5 py-4">
        <div className="min-w-0">
          <p className="eyebrow">
            {picked ? `${p.name} · district` : p.capital}
          </p>
          <h2 className="mt-0.5 truncate font-display text-3xl leading-none text-ink">
            {picked ? picked.name.replace(/ (District|Metro)$/, "") : p.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={picked ? () => onSelectDistrict(null) : onClose}
          aria-label={picked ? "Back to the province" : "Close province"}
          className="btn shrink-0 px-2.5 py-1.5"
        >
          {picked ? "↩" : "✕"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
        <dl
          className="grid animate-rise grid-cols-3 gap-px border border-rule bg-rule"
          style={step(0)}
        >
          <Stat
            label="Advertised"
            value={p.advertised2020 > 0 ? group(p.advertised2020) : "0"}
            unit="ha"
          />
          <Stat
            label="Released"
            value={p.released2020 !== null ? group(p.released2020) : "—"}
            unit={p.released2020 !== null ? "ha" : undefined}
          />
          <Stat
            label="State land"
            value={
              p.stateLandSharePct !== null ? `${p.stateLandSharePct}%` : "—"
            }
          />
        </dl>

        <p className="mt-2 text-xs text-muted">
          Advertised: October 2020 · Released: February 2020. Separate release
          rounds, not current listings.
        </p>

        <section className="mt-5 animate-rise" style={step(1)}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="eyebrow">{districts.length} districts</p>
            {picked && (
              <button
                type="button"
                onClick={() => onSelectDistrict(null)}
                className="eyebrow underline decoration-rule underline-offset-4 hover:text-ink"
              >
                Show all
              </button>
            )}
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {districts.map((d, i) => {
              const on = district === d.id;
              return (
                <li key={d.id} className="animate-rise" style={step(2 + i * 0.35)}>
                  <button
                    type="button"
                    onClick={() => onSelectDistrict(on ? null : d.id)}
                    aria-pressed={on}
                    className={cx(
                      "border px-2 py-1 text-left text-xs transition-colors duration-150",
                      on
                        ? "border-clay bg-clay text-paper"
                        : "border-rule bg-raised text-muted hover:border-ink/30 hover:text-ink",
                    )}
                  >
                    {d.name.replace(/ (District|Metro)$/, "")}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-2xs leading-snug text-muted">
            Applications go to the office below for the district the farm sits in.
          </p>
        </section>

        <div className="mt-4 flex animate-rise flex-wrap gap-1.5" style={step(4)}>
          {p.commodities.map((c) => (
            <span key={c} className="chip">
              {c}
            </span>
          ))}
        </div>

        <p
          className="mt-4 animate-rise text-sm leading-relaxed text-muted"
          style={step(5)}
        >
          {p.systems}
        </p>

        <div className="mt-5 animate-rise border-t border-ink pt-3" style={step(6)}>
          <p className="eyebrow">Apply here</p>
          <p className="mt-1.5 text-sm leading-snug text-ink">
            {p.pssc.address}
          </p>
          <p className="num mt-1 text-sm">
            {p.pssc.phones.map((phone, i) => (
              <span key={phone}>
                {i > 0 && <span className="text-faint"> · </span>}
                <a
                  href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                  className="text-ink underline decoration-rule underline-offset-4 hover:decoration-clay"
                >
                  {phone}
                </a>
              </span>
            ))}
          </p>

          <ul className="mt-3 space-y-2">
            {p.pssc.officials.map((o) => (
              <li
                key={o.name + o.role}
                className="border-t border-rule pt-2 text-sm"
              >
                <span className="text-ink">{o.name}</span>
                <span className="block text-xs text-muted">{o.role}</span>
                {o.phone && (
                  <span className="num block text-xs text-ink">{o.phone}</span>
                )}
                {o.email && (
                  <a
                    href={`mailto:${o.email}`}
                    className="block break-all text-xs text-clay underline decoration-clay/30 underline-offset-4 hover:decoration-clay"
                  >
                    {o.email}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 border-t border-ink pt-3">
          <p className="eyebrow">Current adverts</p>
          {adverts.length === 0 ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {hasFeed
                ? "No adverts are currently included for this province in the connected feed."
                : "No advert feed is connected. Contact the office above for current farm notices and application dates."}
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {adverts.map((listing) => (
                <ParcelCard
                  key={listing.id}
                  listing={listing}
                  open={openIds.has(listing.id)}
                  onToggle={() => onToggle(listing.id)}
                />
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenOffices}
          className={cx("btn mt-5 w-full justify-center")}
        >
          Both departments and what they handle
        </button>
      </div>
    </aside>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 whitespace-nowrap font-sans text-xl font-semibold leading-none text-ink">
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-muted">{unit}</span>
        )}
      </dd>
    </div>
  );
}
