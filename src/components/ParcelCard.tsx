'use client';

import { useId, useState } from 'react';
import ImageCarousel from './ImageCarousel';
import { closingLabel, cx, hectares, shortDate } from '@/lib/format';
import { useMountedNow } from '@/lib/useMountedNow';
import type { Listing } from '@/lib/types';

const STATUS_STYLE: Record<Listing['status'], string> = {
  open: 'border-good/40 text-good',
  'closing-soon': 'border-clay text-clay',
  assessment: 'border-rule text-muted',
  allocated: 'border-rule text-faint',
};

const STATUS_LABEL: Record<Listing['status'], string> = {
  open: 'Open',
  'closing-soon': 'Closing soon',
  assessment: 'Under assessment',
  allocated: 'Allocated',
};

/** A live advert from the configured feed. Never used for invented listings. */
export default function ParcelCard({
  listing,
  open,
  onToggle,
}: {
  listing: Listing;
  open: boolean;
  onToggle: () => void;
}) {
  const bodyId = useId();
  const [platesOpen, setPlatesOpen] = useState(false);
  const now = useMountedNow();
  const closing = closingLabel(listing.closesOn, now ?? Date.parse(listing.updatedAt));

  return (
    <article className={cx('border bg-surface transition-colors', open ? 'border-ink/30' : 'border-rule hover:border-ink/20')}>
      <h4>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex w-full items-start gap-3 p-4 text-left"
        >
          <span
            aria-hidden="true"
            className={cx(
              'mt-1 shrink-0 font-mono text-sm text-faint transition-transform duration-200',
              open && 'rotate-90 text-clay',
            )}
          >
            ▸
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="num text-2xs uppercase tracking-[0.1em] text-faint">
                {listing.reference}
              </span>
              <span className={cx('chip', STATUS_STYLE[listing.status])}>
                {STATUS_LABEL[listing.status]}
              </span>
            </span>
            <span className="mt-1.5 block font-display text-lg leading-snug text-ink">
              {listing.title}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
              <span className="num">{hectares(listing.sizeHa)} ha</span>
              <span aria-hidden="true">·</span>
              <span>{listing.district}</span>
              <span aria-hidden="true">·</span>
              <span className={listing.status === 'allocated' ? 'text-faint' : 'text-clay'}>
                {closing}
              </span>
            </span>
          </span>
        </button>
      </h4>

      {open && (
        <div id={bodyId} className="animate-rise border-t border-rule px-4 pb-5 pt-4">
          <p className="max-w-measure text-sm leading-relaxed text-muted">{listing.summary}</p>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
            <Fact label="Extent" value={`${hectares(listing.sizeHa)} ha`} />
            <Fact label="Arable" value={`${hectares(listing.arableHa)} ha`} />
            <Fact label="Rainfall" value={`${listing.rainfallMm} mm/yr`} />
            <Fact
              label="Window"
              value={`${shortDate(listing.opensOn)} – ${shortDate(listing.closesOn)}`}
            />
            <Fact label="Soil" value={listing.soil} />
            <Fact label="Water" value={listing.water} />
          </dl>

          {listing.infrastructure.length > 0 && (
            <>
              <p className="eyebrow mt-5">On the parcel</p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {listing.infrastructure.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-ink">
                    <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 bg-clay" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-5 border border-rule bg-raised p-4">
            <p className="eyebrow">Who to contact</p>
            <div className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <div>
                <p className="text-sm text-ink">{listing.contact.person}</p>
                <p className="text-sm text-muted">{listing.contact.office}</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="num text-ink">{listing.contact.phone}</p>
                <p className="break-all text-clay">{listing.contact.email}</p>
              </div>
            </div>
          </div>

          {listing.images.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setPlatesOpen((v) => !v)}
                aria-expanded={platesOpen}
                className="flex w-full items-center justify-between border border-rule bg-raised px-3 py-2.5 text-left transition-colors hover:border-ink/25"
              >
                <span className="eyebrow">
                  Site plates ({listing.images.length}) — {platesOpen ? 'hide' : 'show'}
                </span>
                <span
                  aria-hidden="true"
                  className={cx(
                    'font-mono text-sm text-faint transition-transform duration-200',
                    platesOpen && 'rotate-90 text-clay',
                  )}
                >
                  ▸
                </span>
              </button>
              {platesOpen && (
                <div className="mt-3 animate-rise">
                  <ImageCarousel
                    images={listing.images}
                    seed={listing.id}
                    label={`${listing.title} site plates`}
                  />
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <a
              className="btn-solid"
              href={`mailto:${listing.contact.email}?subject=${encodeURIComponent(
                `Enquiry: ${listing.reference} — ${listing.title}`,
              )}`}
            >
              Email the office
            </a>
            <a className="btn" href={`tel:${listing.contact.phone.replace(/[^+\d]/g, '')}`}>
              Call
            </a>
            <a
              className="btn"
              href={`https://www.openstreetmap.org/?mlat=${listing.coordinates[1]}&mlon=${listing.coordinates[0]}#map=12/${listing.coordinates[1]}/${listing.coordinates[0]}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              Location
            </a>
          </div>
        </div>
      )}
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-rule pt-2">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 text-sm leading-snug text-ink">{value}</dd>
    </div>
  );
}
