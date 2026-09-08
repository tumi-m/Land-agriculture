'use client';

import { useEffect, useMemo, useState } from 'react';
import { DOCUMENTS } from '@/content/process';
import { cx } from '@/lib/format';

const STORE = 'all-preflight';

export type Applicant = 'individual' | 'entity';

/**
 * Form ALA pre-flight check.
 *
 * The department returns applications on missing annexures more often than on
 * weak plans, so this is a working checklist rather than a list to read: it
 * remembers what you have ticked and says what is still outstanding.
 */
export default function Preflight({
  applicant: fixedApplicant,
  compact = false,
}: {
  applicant?: Applicant;
  compact?: boolean;
}) {
  const [applicant, setApplicant] = useState<Applicant>(fixedApplicant ?? 'individual');
  const [have, setHave] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE);
      if (saved) setHave(new Set(JSON.parse(saved) as string[]));
    } catch {
      /* private mode — the checklist still works, it just will not persist */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (fixedApplicant) setApplicant(fixedApplicant);
  }, [fixedApplicant]);

  const items = useMemo(
    () => DOCUMENTS.filter((d) => d.appliesTo === 'everyone' || applicant === 'entity'),
    [applicant],
  );

  const done = items.filter((i) => have.has(i.label)).length;
  const ready = done === items.length;

  const toggle = (label: string) => {
    setHave((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      try {
        localStorage.setItem(STORE, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className={cx(!compact && 'border border-rule bg-surface p-5')}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Form ALA pre-flight</p>
          {!compact && (
            <p className="mt-1 font-display text-xl leading-tight text-ink">
              Do you have the annexures?
            </p>
          )}
        </div>

        {!fixedApplicant && (
          <div className="flex gap-1.5">
            {(['individual', 'entity'] as Applicant[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setApplicant(a)}
                aria-pressed={applicant === a}
                className={cx(
                  'border px-2.5 py-1 text-sm transition-colors',
                  applicant === a
                    ? 'border-clay bg-clay text-paper'
                    : 'border-rule bg-raised text-muted hover:text-ink',
                )}
              >
                {a === 'individual' ? 'Own name' : 'Company / trust / co-op'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 bg-rule" role="presentation">
          <div
            className={cx('h-full transition-[width] duration-300 ease-out', ready ? 'bg-good' : 'bg-clay')}
            style={{ width: `${(done / items.length) * 100}%` }}
          />
        </div>
        <p className="num shrink-0 text-2xs text-muted" aria-live="polite">
          {loaded ? `${done} / ${items.length}` : `— / ${items.length}`}
        </p>
      </div>

      <ul className="mt-4 space-y-1">
        {items.map((item) => {
          const checked = have.has(item.label);
          return (
            <li key={item.label}>
              <label
                className={cx(
                  'flex cursor-pointer items-start gap-3 border px-3 py-2 transition-colors',
                  checked ? 'border-good/40 bg-good/5' : 'border-rule bg-raised hover:border-ink/25',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item.label)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--good))]"
                />
                <span className="min-w-0">
                  <span className={cx('block text-sm leading-snug', checked ? 'text-muted line-through decoration-1' : 'text-ink')}>
                    {item.label}
                  </span>
                  {item.note && <span className="block text-xs text-muted">{item.note}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <p className={cx('mt-4 text-sm leading-relaxed', ready ? 'text-good' : 'text-muted')}>
        {ready
          ? 'Every annexure ticked. Seal the set in an envelope endorsed with the farm name and deposit it in the tender box at the office handling that district.'
          : `${items.length - done} still outstanding. Applications are returned on missing annexures more often than on weak business plans — get these together before the advert closes.`}
      </p>
    </div>
  );
}
