'use client';

import { cx } from '@/lib/format';
import { ENTERPRISE_LABELS } from '@/lib/provinces';
import type { Enterprise } from '@/lib/types';

export type SizeBucket = 'any' | 'small' | 'medium' | 'large';
export type SortKey = 'closing' | 'size-desc' | 'size-asc' | 'updated';

export interface FilterState {
  query: string;
  enterprises: Enterprise[];
  sizeBucket: SizeBucket;
  openOnly: boolean;
  sort: SortKey;
}

export const EMPTY_FILTERS: FilterState = {
  query: '',
  enterprises: [],
  sizeBucket: 'any',
  openOnly: false,
  sort: 'closing',
};

export const SIZE_BUCKETS: Record<SizeBucket, { label: string; test: (ha: number) => boolean }> = {
  any: { label: 'Any size', test: () => true },
  small: { label: 'Under 100 ha', test: (ha) => ha < 100 },
  medium: { label: '100 – 500 ha', test: (ha) => ha >= 100 && ha <= 500 },
  large: { label: 'Over 500 ha', test: (ha) => ha > 500 },
};

const SORT_LABELS: Record<SortKey, string> = {
  closing: 'Closing soonest',
  'size-desc': 'Largest first',
  'size-asc': 'Smallest first',
  updated: 'Recently updated',
};

export function isFiltered(f: FilterState): boolean {
  return (
    f.query.trim() !== '' || f.enterprises.length > 0 || f.sizeBucket !== 'any' || f.openOnly
  );
}

export default function Filters({
  value,
  onChange,
  resultCount,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  resultCount: number;
}) {
  const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) =>
    onChange({ ...value, [key]: v });

  const toggleEnterprise = (e: Enterprise) =>
    set(
      'enterprises',
      value.enterprises.includes(e)
        ? value.enterprises.filter((x) => x !== e)
        : [...value.enterprises, e],
    );

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="parcel-search" className="label">
          Search
        </label>
        <input
          id="parcel-search"
          type="search"
          value={value.query}
          onChange={(e) => set('query', e.target.value)}
          placeholder="District, town, reference, enterprise…"
          className="mt-1.5 w-full border border-rule bg-raised px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-ink/40 focus:outline-none focus-visible:outline-2 focus-visible:outline-signal"
        />
      </div>

      <fieldset>
        <legend className="label">Enterprise</legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(Object.keys(ENTERPRISE_LABELS) as Enterprise[]).map((e) => {
            const on = value.enterprises.includes(e);
            return (
              <button
                key={e}
                type="button"
                onClick={() => toggleEnterprise(e)}
                aria-pressed={on}
                className={cx(
                  'chip transition-colors duration-150',
                  on ? 'border-signal bg-signal text-paper' : 'hover:border-ink/30',
                )}
              >
                {ENTERPRISE_LABELS[e]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Extent</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {(Object.keys(SIZE_BUCKETS) as SizeBucket[]).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => set('sizeBucket', b)}
              aria-pressed={value.sizeBucket === b}
              className={cx(
                'chip justify-center transition-colors duration-150',
                value.sizeBucket === b ? 'border-ink bg-ink text-paper' : 'hover:border-ink/30',
              )}
            >
              {SIZE_BUCKETS[b].label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={value.openOnly}
            onChange={(e) => set('openOnly', e.target.checked)}
            className="h-4 w-4 accent-[rgb(var(--signal))]"
          />
          Accepting applications only
        </label>

        <label className="flex items-center gap-2">
          <span className="label">Sort</span>
          <select
            value={value.sort}
            onChange={(e) => set('sort', e.target.value as SortKey)}
            className="border border-rule bg-raised px-2 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-signal"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-rule pt-3">
        <p className="label">
          <span className="num text-ink">{resultCount}</span> matching
        </p>
        {isFiltered(value) && (
          <button type="button" onClick={() => onChange({ ...EMPTY_FILTERS, sort: value.sort })} className="btn">
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
