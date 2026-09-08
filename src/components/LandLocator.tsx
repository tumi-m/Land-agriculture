'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Filters, { EMPTY_FILTERS, SIZE_BUCKETS, isFiltered, type FilterState } from './Filters';
import LiveStatus from './LiveStatus';
import MapCanvas from './MapCanvas';
import ParcelCard from './ParcelCard';
import ProvincePanel from './ProvincePanel';
import { closingLabel, cx, daysUntil, hectares } from '@/lib/format';
import { NATIONAL_PORTAL, PROVINCES, PROVINCE_ORDER } from '@/lib/provinces';
import { useLiveData } from '@/lib/useLiveData';
import { useMountedNow } from '@/lib/useMountedNow';
import type { Dataset, Listing, ProvinceCode } from '@/lib/types';

const SHORTLIST_KEY = 'all-shortlist';
const THEME_KEY = 'all-theme';

function matches(listing: Listing, filters: FilterState): boolean {
  if (filters.openOnly && listing.status !== 'open' && listing.status !== 'closing-soon') {
    return false;
  }
  if (!SIZE_BUCKETS[filters.sizeBucket].test(listing.sizeHa)) return false;
  if (
    filters.enterprises.length > 0 &&
    !filters.enterprises.some((e) => listing.enterprises.includes(e))
  ) {
    return false;
  }
  const q = filters.query.trim().toLowerCase();
  if (q === '') return true;
  const haystack = [
    listing.title,
    listing.reference,
    listing.district,
    listing.municipality,
    listing.summary,
    PROVINCES[listing.province].name,
    ...listing.enterprises,
  ]
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

function sortListings(listings: Listing[], sort: FilterState['sort']): Listing[] {
  const out = [...listings];
  switch (sort) {
    case 'size-desc':
      return out.sort((a, b) => b.sizeHa - a.sizeHa);
    case 'size-asc':
      return out.sort((a, b) => a.sizeHa - b.sizeHa);
    case 'updated':
      return out.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    default:
      return out.sort((a, b) => Date.parse(a.closesOn) - Date.parse(b.closesOn));
  }
}

export default function LandLocator({
  initial,
  pollHint,
}: {
  initial: Dataset;
  pollHint: number;
}) {
  const { dataset, state, changed, lastCheckedAt, refresh } = useLiveData(initial);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [province, setProvince] = useState<ProvinceCode | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [showShortlist, setShowShortlist] = useState(false);
  const [dark, setDark] = useState(false);

  // Restore province from the URL and the shortlist from this browser.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('province')?.toUpperCase();
    if (code && (PROVINCE_ORDER as string[]).includes(code)) setProvince(code as ProvinceCode);
    try {
      const saved = localStorage.getItem(SHORTLIST_KEY);
      if (saved) setShortlist(new Set(JSON.parse(saved) as string[]));
      setDark(document.documentElement.classList.contains('dark'));
    } catch {
      /* storage unavailable — the app works without it */
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (province) url.searchParams.set('province', province);
    else url.searchParams.delete('province');
    window.history.replaceState(null, '', url);
  }, [province]);

  const toggleShortlist = useCallback((id: string) => {
    setShortlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(SHORTLIST_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const toggleOpen = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  };

  const visible = useMemo(
    () => sortListings(dataset.listings.filter((l) => matches(l, filters)), filters.sort),
    [dataset.listings, filters],
  );

  const inProvince = useMemo(
    () => (province ? visible.filter((l) => l.province === province) : visible),
    [visible, province],
  );

  const now = useMountedNow();
  const clock = now ?? Date.parse(dataset.updatedAt);

  const totals = useMemo(() => {
    const openNow = visible.filter((l) => l.status === 'open' || l.status === 'closing-soon');
    return {
      parcels: visible.length,
      hectares: visible.reduce((s, l) => s + l.sizeHa, 0),
      openNow: openNow.length,
      closingIn14: visible.filter((l) => {
        if (l.status === 'allocated') return false;
        const days = daysUntil(l.closesOn, clock);
        return days >= 0 && days <= 14;
      }).length,
    };
  }, [visible, clock]);

  const byProvince = useMemo(() => {
    const map = new Map<ProvinceCode, Listing[]>();
    for (const l of visible) {
      const list = map.get(l.province) ?? [];
      list.push(l);
      map.set(l.province, list);
    }
    return map;
  }, [visible]);

  const shortlisted = useMemo(
    () => dataset.listings.filter((l) => shortlist.has(l.id)),
    [dataset.listings, shortlist],
  );

  const focusListing = useCallback(
    (id: string) => {
      const listing = dataset.listings.find((l) => l.id === id);
      if (!listing) return;
      setProvince(listing.province);
      setOpenIds((prev) => new Set(prev).add(id));
      window.requestAnimationFrame(() => {
        document
          .getElementById(`parcel-${id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    },
    [dataset.listings],
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-[1560px] px-4 pb-16 lg:px-8">
      <header className="sticky top-0 z-30 -mx-4 mb-5 border-b border-rule bg-paper/85 px-4 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-sm uppercase tracking-[0.3em] text-signal">Asbonge</span>
            <span className="font-mono text-sm uppercase tracking-[0.22em] text-ink">
              Land Locator
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <LiveStatus
              dataset={dataset}
              state={state}
              changed={changed}
              lastCheckedAt={lastCheckedAt}
              onRefresh={refresh}
            />
            <button
              type="button"
              onClick={() => setShowShortlist((v) => !v)}
              className="btn"
              aria-expanded={showShortlist}
            >
              ★ Shortlist <span className="num text-signal">{shortlist.size}</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="btn"
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {dark ? '☀' : '☾'}
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(440px,44%)]">
        <div className="lg:sticky lg:top-[68px] lg:self-start">
          <div className="card h-[52vh] overflow-hidden sm:h-[62vh] lg:h-[calc(100dvh-92px)]">
            <MapCanvas
              listings={visible}
              selected={province}
              onSelectProvince={(code) => {
                setProvince(code);
                setActiveId(null);
              }}
              activeListingId={activeId}
              onSelectListing={(id) => {
                setActiveId(id);
                focusListing(id);
              }}
            />
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <section>
            <h1 className="max-w-[26ch] text-2xl font-medium leading-[1.15] tracking-tight text-ink">
              State agricultural land released for farming, province by province.
            </h1>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
              Click a province to isolate it. Every parcel carries its extent, tenure, enterprise
              mix, the application process and the office that handles it — and the page follows its
              source, so a change reaches an open browser within{' '}
              <span className="num">{pollHint}</span> seconds.
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-4">
              {[
                ['Parcels', String(totals.parcels)],
                ['Open now', String(totals.openNow)],
                ['Extent', `${hectares(totals.hectares)} ha`],
                ['≤14 days', String(totals.closingIn14)],
              ].map(([label, value]) => (
                <div key={label} className="bg-surface px-3 py-2">
                  <dt className="label">{label}</dt>
                  <dd className="num mt-0.5 text-lg leading-tight text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            {dataset.source === 'seed' && (
              <p className="mt-3 border-l-2 border-signal bg-signal-soft/50 px-3 py-2 text-xs leading-relaxed text-ink">
                <strong className="font-medium">Sample dataset.</strong> Geography — provinces,
                districts, coordinates, rainfall — is real; parcels and contact blocks are
                placeholders flagged &ldquo;Sample&rdquo; on every card. Set{' '}
                <code className="num">LAND_DATA_URL</code> to serve a live feed instead.
                {dataset.sourceError && (
                  <span className="ml-1 text-alert">Feed unreadable: {dataset.sourceError}</span>
                )}
              </p>
            )}
          </section>

          {showShortlist && (
            <section className="animate-fade-up border border-rule bg-surface p-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="label text-ink">Your shortlist ({shortlisted.length})</h2>
                <button type="button" onClick={() => setShowShortlist(false)} className="btn">
                  Close
                </button>
              </div>
              {shortlisted.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  Nothing shortlisted yet. Open a parcel and choose ☆ Shortlist to keep it here — it
                  is stored in this browser only.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {shortlisted.map((l) => (
                    <li
                      key={l.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-ink">{l.title}</p>
                        <p className="label mt-0.5">
                          {PROVINCES[l.province].name} · {hectares(l.sizeHa)} ha ·{' '}
                          {closingLabel(l.closesOn, clock)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="btn" onClick={() => focusListing(l.id)}>
                          Open
                        </button>
                        <button type="button" className="btn" onClick={() => toggleShortlist(l.id)}>
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <div className="card p-4">
            <Filters value={filters} onChange={setFilters} resultCount={visible.length} />
          </div>

          {province ? (
            <ProvincePanel
              code={province}
              listings={inProvince}
              openIds={openIds}
              onToggle={toggleOpen}
              shortlist={shortlist}
              onShortlist={toggleShortlist}
              onClose={() => setProvince(null)}
              filtered={isFiltered(filters)}
            />
          ) : (
            <section aria-label="All provinces">
              <h2 className="label">Provinces</h2>
              <ul className="mt-2 divide-y divide-rule border border-rule bg-surface">
                {PROVINCE_ORDER.map((code) => {
                  const list = byProvince.get(code) ?? [];
                  const ha = list.reduce((s, l) => s + l.sizeHa, 0);
                  return (
                    <li key={code}>
                      <button
                        type="button"
                        onClick={() => setProvince(code)}
                        disabled={list.length === 0}
                        className={cx(
                          'flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-150',
                          list.length === 0
                            ? 'cursor-not-allowed opacity-45'
                            : 'hover:bg-signal-soft/50',
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-ink">
                            {PROVINCES[code].name}
                          </span>
                          <span className="label mt-0.5 block">{PROVINCES[code].capital}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-4">
                          <span className="num text-sm text-muted">{hectares(ha)} ha</span>
                          <span
                            className={cx(
                              'num flex h-7 w-7 items-center justify-center border text-2xs',
                              list.length > 0
                                ? 'border-signal/50 bg-signal/10 text-signal'
                                : 'border-rule text-faint',
                            )}
                          >
                            {list.length}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <h2 className="label mt-6">Closing soonest</h2>
              <div className="mt-2 space-y-2">
                {visible.slice(0, 4).map((listing) => (
                  <div key={listing.id} id={`parcel-${listing.id}`} className="scroll-mt-24">
                    <ParcelCard
                      listing={listing}
                      open={openIds.has(listing.id)}
                      onToggle={() => toggleOpen(listing.id)}
                      shortlisted={shortlist.has(listing.id)}
                      onShortlist={() => toggleShortlist(listing.id)}
                    />
                  </div>
                ))}
                {visible.length === 0 && (
                  <p className="card p-6 text-center text-sm text-muted">
                    Nothing matches those filters. Clear one and try again.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <footer className="mt-12 border-t border-rule pt-5">
        <p className="max-w-prose text-sm leading-relaxed text-muted">
          Applications, closing dates and contact details are set by the issuing office. Always
          confirm a listing against the{' '}
          <a
            href={NATIONAL_PORTAL.url}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-rule underline-offset-4 hover:text-ink"
          >
            {NATIONAL_PORTAL.name}
          </a>{' '}
          or the provincial department before you submit anything. No application is ever charged
          for on this site.
        </p>
        <p className="label mt-3">
          Boundaries: district municipalities, simplified · Dataset revision{' '}
          <span className="num">{dataset.revision}</span>
        </p>
      </footer>
    </div>
  );
}
