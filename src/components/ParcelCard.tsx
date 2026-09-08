'use client';

import { useId, useState } from 'react';
import ImageCarousel from './ImageCarousel';
import { closingLabel, cx, hectares, shortDate } from '@/lib/format';
import { useMountedNow } from '@/lib/useMountedNow';
import { ENTERPRISE_LABELS, STATUS_LABELS, TENURE_LABELS } from '@/lib/provinces';
import type { Listing } from '@/lib/types';

const STATUS_STYLE: Record<Listing['status'], string> = {
  open: 'border-veld/40 bg-veld/10 text-veld',
  'closing-soon': 'border-signal/50 bg-signal/10 text-signal',
  assessment: 'border-rule bg-raised text-muted',
  allocated: 'border-rule bg-raised text-faint line-through decoration-1',
};

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-t border-rule pt-2">
      <dt className="label">{label}</dt>
      <dd className="mt-1 text-sm leading-snug text-ink">{value}</dd>
    </div>
  );
}

function Copyable({ value, children }: { value: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      className="group inline-flex items-center gap-1.5 text-left underline decoration-rule underline-offset-4 hover:decoration-signal"
      aria-label={`Copy ${value}`}
    >
      {children}
      <span className="label opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {copied ? 'copied' : 'copy'}
      </span>
    </button>
  );
}

export default function ParcelCard({
  listing,
  open,
  onToggle,
  shortlisted,
  onShortlist,
}: {
  listing: Listing;
  open: boolean;
  onToggle: () => void;
  shortlisted: boolean;
  onShortlist: () => void;
}) {
  const bodyId = useId();
  const [platesOpen, setPlatesOpen] = useState(false);
  // Before hydration the countdown is measured from the record's own timestamp,
  // which is stable; afterwards it tracks the viewer's clock.
  const now = useMountedNow();
  const closing = closingLabel(listing.closesOn, now ?? Date.parse(listing.updatedAt));
  const isClosed = closing === 'Closed' || listing.status === 'allocated';

  return (
    <article
      className={cx(
        'card transition-colors duration-200',
        open ? 'border-ink/25' : 'hover:border-ink/20',
      )}
    >
      <h3>
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
              'mt-1 shrink-0 font-mono text-sm text-faint transition-transform duration-200 ease-out',
              open && 'rotate-90 text-signal',
            )}
          >
            ▸
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="num text-2xs uppercase tracking-[0.1em] text-faint">
                {listing.reference}
              </span>
              <span className={cx('chip', STATUS_STYLE[listing.status])}>
                {STATUS_LABELS[listing.status]}
              </span>
              {!listing.verified && (
                <span
                  className="chip border-dashed"
                  title="Sample record — confirm details with the issuing office"
                >
                  Sample
                </span>
              )}
            </span>
            <span className="mt-1.5 block text-base font-medium leading-snug text-ink">
              {listing.title}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="num">{hectares(listing.sizeHa)} ha</span>
              <span aria-hidden="true">·</span>
              <span>{listing.district}</span>
              <span aria-hidden="true">·</span>
              <span className={cx(isClosed ? 'text-faint' : 'text-signal')}>{closing}</span>
            </span>
          </span>
          <span className="hidden shrink-0 flex-wrap justify-end gap-1 sm:flex">
            {listing.enterprises.slice(0, 3).map((e) => (
              <span key={e} className="chip">
                {ENTERPRISE_LABELS[e]}
              </span>
            ))}
          </span>
        </button>
      </h3>

      {open && (
        <div id={bodyId} className="animate-fade-up border-t border-rule px-4 pb-5 pt-4">
          <p className="max-w-prose text-sm leading-relaxed text-muted">{listing.summary}</p>

          <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 lg:grid-cols-4">
            <Fact label="Total extent" value={<span className="num">{hectares(listing.sizeHa)} ha</span>} />
            <Fact label="Arable" value={<span className="num">{hectares(listing.arableHa)} ha</span>} />
            <Fact label="Tenure offered" value={TENURE_LABELS[listing.tenure]} />
            <Fact
              label="Mean rainfall"
              value={<span className="num">{listing.rainfallMm} mm/yr</span>}
            />
            <Fact label="Soil" value={listing.soil} />
            <Fact label="Water" value={listing.water} />
            <Fact label="Municipality" value={listing.municipality} />
            <Fact
              label="Application window"
              value={`${shortDate(listing.opensOn)} – ${shortDate(listing.closesOn)}`}
            />
          </dl>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section>
              <h4 className="label">On the parcel</h4>
              <ul className="mt-2 space-y-1.5">
                {listing.infrastructure.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-ink">
                    <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 bg-signal" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>

              <h4 className="label mt-5">Who may apply</h4>
              <ul className="mt-2 space-y-1.5">
                {listing.eligibility.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-snug text-muted">
                    <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 bg-rule" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="label">How to apply</h4>
              <ol className="mt-2 space-y-3">
                {listing.applicationSteps.map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="num mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-rule text-2xs text-muted">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{step.title}</p>
                      <p className="mt-0.5 text-sm leading-snug text-muted">{step.detail}</p>
                      {step.documents && (
                        <ul className="mt-1.5 flex flex-wrap gap-1">
                          {step.documents.map((doc) => (
                            <li key={doc} className="chip">
                              {doc}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <section className="mt-6 border border-rule bg-raised p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="label">Who to contact</h4>
              {!listing.verified && (
                <p className="text-2xs text-faint">
                  Sample contact block — confirm against the office&rsquo;s own publication
                </p>
              )}
            </div>
            <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-ink">{listing.contact.person}</p>
                <p className="text-sm text-muted">{listing.contact.role}</p>
                <p className="mt-1 text-sm text-muted">{listing.contact.office}</p>
              </div>
              <div className="space-y-1.5 text-sm">
                <p>
                  <span className="label mr-2">Tel</span>
                  <Copyable value={listing.contact.phone}>
                    <span className="num">{listing.contact.phone}</span>
                  </Copyable>
                </p>
                <p>
                  <span className="label mr-2">Email</span>
                  <Copyable value={listing.contact.email}>
                    <span className="break-all">{listing.contact.email}</span>
                  </Copyable>
                </p>
                <p className="text-muted">
                  <span className="label mr-2">Office</span>
                  {listing.contact.address}
                </p>
                <p className="text-muted">
                  <span className="label mr-2">Hours</span>
                  {listing.contact.hours}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-4">
            <button
              type="button"
              onClick={() => setPlatesOpen((v) => !v)}
              aria-expanded={platesOpen}
              className="flex w-full items-center justify-between border border-rule bg-raised px-3 py-2.5 text-left transition-colors hover:border-ink/25"
            >
              <span className="label text-muted">
                Site plates ({listing.images.length}) — {platesOpen ? 'hide' : 'show'}
              </span>
              <span
                aria-hidden="true"
                className={cx(
                  'font-mono text-sm text-faint transition-transform duration-200',
                  platesOpen && 'rotate-90 text-signal',
                )}
              >
                ▸
              </span>
            </button>
            {platesOpen && (
              <div className="mt-3 animate-fade-up">
                <ImageCarousel
                  images={listing.images}
                  seed={listing.id}
                  label={`${listing.title} site plates`}
                />
              </div>
            )}
          </section>

          <div className="mt-5 flex flex-wrap items-center gap-2">
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
            <button type="button" onClick={onShortlist} className="btn" aria-pressed={shortlisted}>
              {shortlisted ? '★ Shortlisted' : '☆ Shortlist'}
            </button>
            <a
              className="btn"
              href={`https://www.openstreetmap.org/?mlat=${listing.coordinates[1]}&mlon=${listing.coordinates[0]}#map=12/${listing.coordinates[1]}/${listing.coordinates[0]}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open location
            </a>
            {listing.documents.map((doc) => (
              <a
                key={doc.label}
                className="btn"
                href={doc.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                {doc.label}
              </a>
            ))}
          </div>

          <p className="mt-4 text-2xs text-faint">
            Reference {listing.reference} · updated {shortDate(listing.updatedAt)} ·{' '}
            <span className="num">
              {listing.coordinates[1].toFixed(4)}°S {listing.coordinates[0].toFixed(4)}°E
            </span>
          </p>
        </div>
      )}
    </article>
  );
}
