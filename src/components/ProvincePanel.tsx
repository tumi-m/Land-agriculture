'use client';

import ParcelCard from './ParcelCard';
import { PROVINCES } from '@/content/provinces';
import { cx, group } from '@/lib/format';
import type { Listing, ProvinceCode } from '@/lib/types';

/** Slides over the map when a province is picked. Figures first, prose last. */
export default function ProvincePanel({
  code,
  adverts,
  openIds,
  onToggle,
  onClose,
  onOpenOffices,
}: {
  code: ProvinceCode;
  adverts: Listing[];
  openIds: Set<string>;
  onToggle: (id: string) => void;
  onClose: () => void;
  onOpenOffices: () => void;
}) {
  const p = PROVINCES[code];

  return (
    <aside
      aria-label={`${p.name} detail`}
      className="pointer-events-auto flex h-full w-full flex-col border-l border-rule bg-paper/95 backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-4 border-b border-ink px-5 py-4">
        <div className="min-w-0">
          <p className="eyebrow">{p.capital}</p>
          <h2 className="mt-0.5 font-display text-3xl leading-none text-ink">{p.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close province"
          className="btn shrink-0 px-2.5 py-1.5"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
        <dl className="grid grid-cols-3 gap-px border border-rule bg-rule">
          <Stat label="Advertised" value={p.advertised2020 > 0 ? group(p.advertised2020) : '0'} unit="ha" />
          <Stat
            label="Released"
            value={p.released2020 !== null ? group(p.released2020) : '—'}
            unit={p.released2020 !== null ? 'ha' : undefined}
          />
          <Stat
            label="State land"
            value={p.stateLandSharePct !== null ? `${p.stateLandSharePct}%` : '—'}
          />
        </dl>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {p.commodities.map((c) => (
            <span key={c} className="chip">
              {c}
            </span>
          ))}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted">{p.systems}</p>

        <div className="mt-5 border-t border-ink pt-3">
          <p className="eyebrow">Apply here</p>
          <p className="mt-1.5 text-sm leading-snug text-ink">{p.pssc.address}</p>
          <p className="num mt-1 text-sm">
            {p.pssc.phones.map((phone, i) => (
              <span key={phone}>
                {i > 0 && <span className="text-faint"> · </span>}
                <a
                  href={`tel:${phone.replace(/[^+\d]/g, '')}`}
                  className="text-ink underline decoration-rule underline-offset-4 hover:decoration-clay"
                >
                  {phone}
                </a>
              </span>
            ))}
          </p>

          <ul className="mt-3 space-y-2">
            {p.pssc.officials.map((o) => (
              <li key={o.name + o.role} className="border-t border-rule pt-2 text-sm">
                <span className="text-ink">{o.name}</span>
                <span className="block text-xs text-muted">{o.role}</span>
                {o.phone && <span className="num block text-xs text-ink">{o.phone}</span>}
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
              No advert feed is connected, so nothing is listed. Farms are advertised by the
              department and collected from the office above.
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

        <button type="button" onClick={onOpenOffices} className={cx('btn mt-5 w-full justify-center')}>
          Both departments and what they handle
        </button>
      </div>
    </aside>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 whitespace-nowrap font-sans text-xl font-semibold leading-none text-ink">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted">{unit}</span>}
      </dd>
    </div>
  );
}
