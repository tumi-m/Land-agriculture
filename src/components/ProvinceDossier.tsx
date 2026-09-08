'use client';

import ParcelCard from './ParcelCard';
import { PROVINCES } from '@/content/provinces';
import { NATIONAL_PORTAL } from '@/lib/provinces';
import { group } from '@/lib/format';
import type { Listing, ProvinceCode } from '@/lib/types';

export default function ProvinceDossier({
  code,
  adverts,
  openIds,
  onToggle,
  onClose,
}: {
  code: ProvinceCode;
  adverts: Listing[];
  openIds: Set<string>;
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const p = PROVINCES[code];

  return (
    <section aria-labelledby="dossier-heading" className="animate-rise">
      <div className="flex items-start justify-between gap-6 border-b border-ink pb-3">
        <div className="min-w-0">
          <p className="eyebrow">{p.capital} · Province {code}</p>
          <h3 id="dossier-heading" className="mt-1 font-display text-opener leading-none text-ink">
            {p.name}
          </h3>
        </div>
        <button type="button" onClick={onClose} className="btn shrink-0">
          All provinces
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-px border border-rule bg-rule">
        <div className="bg-surface px-3 py-3">
          <dt className="eyebrow">Advertised 2020</dt>
          <dd className="figure mt-1.5 whitespace-nowrap">
            {p.advertised2020 > 0 ? group(p.advertised2020) : '0'}
            <span className="ml-1 font-sans text-sm font-normal text-muted">ha</span>
          </dd>
        </div>
        <div className="bg-surface px-3 py-3">
          <dt className="eyebrow">Released Feb 2020</dt>
          <dd className="figure mt-1.5 whitespace-nowrap">
            {p.released2020 !== null ? group(p.released2020) : '—'}
            {p.released2020 !== null && (
              <span className="ml-1 font-sans text-sm font-normal text-muted">ha</span>
            )}
          </dd>
        </div>
        <div className="bg-surface px-3 py-3">
          <dt className="eyebrow">State land</dt>
          <dd className="figure mt-1.5">
            {p.stateLandSharePct !== null ? `${p.stateLandSharePct}%` : '—'}
          </dd>
        </div>
      </dl>

      {p.releasedNote && <p className="mt-3 text-xs text-muted">{p.releasedNote}</p>}

      <p className="lede mt-5">{p.systems}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {p.commodities.map((c) => (
          <span key={c} className="chip">
            {c}
          </span>
        ))}
      </div>

      <div className="mt-7 border-t border-ink pt-4">
        <p className="eyebrow">Provincial Shared Service Centre</p>
        <p className="mt-2 max-w-measure text-sm leading-relaxed text-ink">{p.pssc.address}</p>
        <p className="mt-1 text-sm text-muted">{p.pssc.postal}</p>
        <p className="num mt-2 text-sm text-ink">
          {p.pssc.phones.map((phone, i) => (
            <span key={phone}>
              {i > 0 && <span className="text-faint"> · </span>}
              <a
                href={`tel:${phone.replace(/[^+\d]/g, '')}`}
                className="underline decoration-rule underline-offset-4 hover:decoration-clay"
              >
                {phone}
              </a>
            </span>
          ))}
        </p>

        <table className="mt-4 w-full border-collapse text-sm">
          <caption className="sr-only">Officials at the {p.name} shared service centre</caption>
          <tbody>
            {p.pssc.officials.map((o) => (
              <tr key={o.name + o.role} className="border-t border-rule align-top">
                <th scope="row" className="py-2 pr-4 text-left font-normal text-ink">
                  {o.name}
                </th>
                <td className="py-2 pr-4 text-muted">{o.role}</td>
                <td className="py-2 text-right">
                  {o.phone && <span className="num block text-ink">{o.phone}</span>}
                  {o.email && (
                    <a
                      href={`mailto:${o.email}`}
                      className="block break-all text-xs text-clay underline decoration-clay/30 underline-offset-4 hover:decoration-clay"
                    >
                      {o.email}
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-7 border-t border-ink pt-4">
        <p className="eyebrow">Current adverts</p>
        {adverts.length === 0 ? (
          <div className="mt-3 border border-dashed border-rule p-5">
            <p className="max-w-measure text-sm leading-relaxed text-ink">
              No live advert feed is connected, so nothing is listed here.
            </p>
            <p className="mt-2 max-w-measure text-sm leading-relaxed text-muted">
              Farms are advertised by the department in the press and on its website, and forms are
              collected from — and returned to — the office above. This page will list them here the
              moment a feed is configured; it never invents a listing.
            </p>
            <a
              className="btn mt-4"
              href={NATIONAL_PORTAL.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              Check the department’s site
            </a>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {adverts.map((listing) => (
              <div key={listing.id} id={`parcel-${listing.id}`} className="scroll-mt-28">
                <ParcelCard
                  listing={listing}
                  open={openIds.has(listing.id)}
                  onToggle={() => onToggle(listing.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
