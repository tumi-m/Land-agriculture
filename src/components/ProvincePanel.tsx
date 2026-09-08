'use client';

import { useMemo } from 'react';
import ParcelCard from './ParcelCard';
import { cx, hectares } from '@/lib/format';
import { NATIONAL_PORTAL, PROVINCES } from '@/lib/provinces';
import type { Listing, ProvinceCode } from '@/lib/types';

export default function ProvincePanel({
  code,
  listings,
  openIds,
  onToggle,
  shortlist,
  onShortlist,
  onClose,
  filtered,
}: {
  code: ProvinceCode;
  listings: Listing[];
  openIds: Set<string>;
  onToggle: (id: string) => void;
  shortlist: Set<string>;
  onShortlist: (id: string) => void;
  onClose: () => void;
  filtered: boolean;
}) {
  const province = PROVINCES[code];

  const stats = useMemo(() => {
    const totalHa = listings.reduce((sum, l) => sum + l.sizeHa, 0);
    const arableHa = listings.reduce((sum, l) => sum + l.arableHa, 0);
    const open = listings.filter((l) => l.status === 'open' || l.status === 'closing-soon').length;
    const districts = new Map<string, number>();
    for (const l of listings) districts.set(l.district, (districts.get(l.district) ?? 0) + 1);
    return {
      totalHa,
      arableHa,
      open,
      districts: [...districts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [listings]);

  return (
    <section aria-labelledby="province-heading" className="animate-slide-in">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label">Province {code}</p>
          <h2 id="province-heading" className="mt-1 text-2xl font-medium tracking-tight text-ink">
            {province.name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Seat of government: {province.capital} · {province.department}
          </p>
        </div>
        <button type="button" onClick={onClose} className="btn shrink-0">
          ✕ All provinces
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-4">
        {[
          ['Parcels', String(listings.length)],
          ['Open now', String(stats.open)],
          ['Total extent', `${hectares(stats.totalHa)} ha`],
          ['Arable', `${hectares(stats.arableHa)} ha`],
        ].map(([label, value]) => (
          <div key={label} className="bg-surface px-3 py-2.5">
            <dt className="label">{label}</dt>
            <dd className="num mt-0.5 text-lg text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      {stats.districts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stats.districts.map(([district, n]) => (
            <span key={district} className="chip">
              {district}
              <span className="num text-ink">{n}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 space-y-2">
        {listings.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-muted">
              {filtered
                ? 'No parcels in this province match the current filters.'
                : 'No parcels are listed in this province in the current dataset.'}
            </p>
            <p className="mt-2 text-2xs text-faint">
              New releases are advertised by the province and through{' '}
              <a
                href={NATIONAL_PORTAL.url}
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-rule underline-offset-4 hover:text-ink"
              >
                {NATIONAL_PORTAL.abbr}
              </a>
              .
            </p>
          </div>
        ) : (
          listings.map((listing) => (
            <div key={listing.id} id={`parcel-${listing.id}`} className={cx('scroll-mt-24')}>
              <ParcelCard
                listing={listing}
                open={openIds.has(listing.id)}
                onToggle={() => onToggle(listing.id)}
                shortlisted={shortlist.has(listing.id)}
                onShortlist={() => onShortlist(listing.id)}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
