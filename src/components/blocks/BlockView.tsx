'use client';

import Preflight from '../Preflight';
import { CATEGORIES } from '@/content/categories';
import { PROVINCES } from '@/content/provinces';
import { RISKS } from '@/content/risks';
import { STAGES, TOTAL_DAYS } from '@/content/process';
import { cx, group } from '@/lib/format';
import type { Block } from '@/lib/blocks';

/**
 * The registry: one component per block kind.
 *
 * A kind the registry does not know renders as nothing rather than crashing the
 * answer — the engine and the renderer are allowed to be at different versions.
 */
export default function BlockView({ block, index }: { block: Block; index: number }) {
  const style = { animationDelay: `${Math.min(index, 8) * 70}ms` };

  switch (block.kind) {
    case 'verdict': {
      const category = CATEGORIES.find((c) => c.id === block.category);
      if (!category) return null;
      return (
        <Shell style={style} accent>
          <p className="eyebrow">You look like</p>
          <p className="mt-1 font-display text-opener leading-none text-ink">
            Category {category.id}
          </p>
          <p className="mt-1 font-display text-xl italic text-clay">{category.name}</p>
          <p className="mt-3 max-w-measure text-sm leading-relaxed text-muted">{block.because}</p>
          <p className="mt-3 border-t border-rule pt-3 text-sm leading-relaxed text-ink">
            {category.profile}
          </p>
        </Shell>
      );
    }

    case 'blocker':
      return (
        <Shell style={style} tone={block.severity === 'bar' ? 'critical' : 'warn'}>
          <p className="eyebrow" style={{ color: 'rgb(var(--critical))' }}>
            {block.severity === 'bar' ? 'Disqualifying' : 'Timing rule'}
          </p>
          <p className="mt-1 font-display text-xl leading-tight text-ink">{block.title}</p>
          <p className="mt-2 max-w-measure text-sm leading-relaxed text-muted">{block.detail}</p>
          {block.clears && (
            <p className="mt-2 text-sm text-ink">
              <span className="eyebrow mr-2">Clears</span>
              {block.clears}
            </p>
          )}
        </Shell>
      );

    case 'tenure': {
      const category = CATEGORIES.find((c) => c.id === block.category);
      if (!category) return null;
      return (
        <Shell style={style}>
          <p className="eyebrow">What you would be offered</p>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-3">
            <Field label="Tenure" value={category.tenure} />
            <Field label="Rent" value={category.rental} />
            <Field
              label="Can you ever own it?"
              value={category.purchase}
              tone={category.canBuy ? 'good' : 'plain'}
            />
          </dl>
          <p className="mt-3 border-t border-rule pt-3 text-sm leading-relaxed text-muted">
            {category.support}
          </p>
        </Shell>
      );
    }

    case 'finance': {
      const { tier } = block;
      return (
        <Shell style={style}>
          <p className="eyebrow">Blended Finance Scheme</p>
          <p className="mt-1 font-display text-xl leading-tight text-ink">{tier.producer}</p>
          <div className="mt-3">
            <div className="flex h-7 w-full overflow-hidden" role="img" aria-label={`${tier.grantPct} percent grant, ${tier.loanPct} percent Land Bank loan`}>
              <span
                className="flex items-center justify-center bg-land-600 text-2xs font-medium text-paper"
                style={{ width: `${tier.grantPct}%` }}
              >
                {tier.grantPct}% grant
              </span>
              <span className="w-0.5 shrink-0 bg-surface" />
              <span
                className="flex items-center justify-center bg-land-200 text-2xs font-medium text-ink"
                style={{ width: `${tier.loanPct}%` }}
              >
                {tier.loanPct}% loan
              </span>
            </div>
          </div>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Turnover band" value={tier.turnover} />
            <Field label="Maximum grant" value={tier.capLabel} />
          </dl>
        </Shell>
      );
    }

    case 'office': {
      const record = PROVINCES[block.province];
      return (
        <Shell style={style}>
          <p className="eyebrow">Where your application goes</p>
          <p className="mt-1 font-display text-xl leading-tight text-ink">
            {record.name} Provincial Shared Service Centre
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{record.pssc.address}</p>
          <p className="num mt-1 text-sm text-ink">{record.pssc.phones.join(' · ')}</p>
          <ul className="mt-3 space-y-2 border-t border-rule pt-3">
            {record.pssc.officials.slice(0, 3).map((o) => (
              <li key={o.name} className="text-sm">
                <span className="text-ink">{o.name}</span>
                <span className="text-muted"> — {o.role}</span>
                {o.email && (
                  <a
                    href={`mailto:${o.email}`}
                    className="ml-2 break-all text-clay underline decoration-clay/30 underline-offset-4 hover:decoration-clay"
                  >
                    {o.email}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Shell>
      );
    }

    case 'checklist':
      return (
        <Shell style={style}>
          <Preflight applicant={block.applicant} compact />
        </Shell>
      );

    case 'timeline':
      return (
        <Shell style={style}>
          <p className="eyebrow">If you submit today</p>
          <p className="mt-1 font-display text-xl leading-tight text-ink">
            About {TOTAL_DAYS} days from closing to a signed lease
          </p>
          <ol className="mt-4 space-y-2">
            {STAGES.map((stage) => (
              <li key={stage.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{stage.name}</p>
                  <div
                    className="mt-1 h-2 origin-left animate-draw bg-land-500"
                    style={{ width: `${(stage.days / TOTAL_DAYS) * 100}%`, minWidth: '6px' }}
                  />
                </div>
                <span className="num shrink-0 text-xs text-muted">{stage.duration}</span>
              </li>
            ))}
          </ol>
        </Shell>
      );

    case 'province-fit': {
      const record = PROVINCES[block.province];
      return (
        <Shell style={style}>
          <p className="eyebrow">{record.name}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <span className="figure">
              {record.advertised2020 > 0 ? `${group(record.advertised2020)}` : '0'}
              <span className="ml-1 font-sans text-base font-normal text-muted">ha advertised</span>
            </span>
            {record.stateLandSharePct !== null && (
              <span className="text-sm text-muted">
                <span className="font-medium text-ink">{record.stateLandSharePct}%</span> of the province’s
                registered surface is state land
              </span>
            )}
          </div>
          <p className="mt-3 max-w-measure text-sm leading-relaxed text-muted">{record.systems}</p>
          {block.matched.length > 0 && (
            <p className="mt-3 text-sm text-ink">
              <span className="eyebrow mr-2" style={{ color: 'rgb(var(--good))' }}>
                Good fit
              </span>
              {block.matched.join(', ')} — established here.
            </p>
          )}
          {block.unmatched.length > 0 && (
            <p className="mt-1.5 text-sm text-muted">
              <span className="eyebrow mr-2">Less established</span>
              {block.unmatched.join(', ')}. Possible, but expect to argue it in your business plan.
            </p>
          )}
        </Shell>
      );
    }

    case 'caution': {
      const risk = RISKS.find((r) => r.id === block.riskId);
      if (!risk) return null;
      return (
        <Shell style={style} tone="warn">
          <p className="eyebrow" style={{ color: 'rgb(var(--clay))' }}>
            Know this going in
          </p>
          <p className="mt-1 font-display text-xl leading-tight text-ink">{risk.title}</p>
          <p className="mt-2 max-w-measure text-sm leading-relaxed text-muted">{risk.what}</p>
          <p className="mt-2 max-w-measure text-sm leading-relaxed text-ink">{risk.soWhat}</p>
        </Shell>
      );
    }

    case 'note':
      return (
        <Shell style={style}>
          <p className="eyebrow">Note</p>
          <p className="mt-1 font-display text-xl leading-tight text-ink">{block.title}</p>
          <p className="mt-2 max-w-measure text-sm leading-relaxed text-muted">{block.body}</p>
        </Shell>
      );

    default:
      return null;
  }
}

function Shell({
  children,
  style,
  accent,
  tone = 'plain',
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  accent?: boolean;
  tone?: 'plain' | 'warn' | 'critical';
}) {
  return (
    <section
      style={style}
      className={cx(
        'animate-rise border bg-surface p-5',
        accent && 'border-l-[3px] border-l-clay',
        tone === 'warn' && 'border-l-[3px] border-l-clay bg-clay-soft/40',
        tone === 'critical' && 'border-l-[3px] border-l-critical bg-clay-soft/50',
        !accent && tone === 'plain' && 'border-rule',
      )}
    >
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  tone = 'plain',
}: {
  label: string;
  value: string;
  tone?: 'plain' | 'good';
}) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd
        className={cx('mt-1 text-sm leading-snug', tone === 'good' ? 'text-good' : 'text-ink')}
      >
        {value}
      </dd>
    </div>
  );
}
