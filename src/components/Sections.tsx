'use client';

import { useState } from 'react';
import { CATEGORIES, RENTAL_FORMULA } from '@/content/categories';
import { CASE_STUDIES } from '@/content/cases';
import { COORDINATION, DEPARTMENTS } from '@/content/departments';
import {
  BFS_CRITERIA,
  COLLATERAL_PROBLEM,
  FINANCE_TIERS,
  SUPPORT_PROGRAMMES,
} from '@/content/finance';
import { POLICY_TIMELINE, TRANSFERS } from '@/content/policy';
import {
  EXCLUSIONS,
  FORM_SECTIONS,
  RESIDENCE_RULE,
  STAGES,
  SUBMISSION_RULE,
  TOTAL_DAYS,
} from '@/content/process';
import { RISKS } from '@/content/risks';
import { PROVINCES } from '@/content/provinces';
import { cx, group } from '@/lib/format';
import Preflight from './Preflight';
import SgCode from './SgCode';

const CATEGORY_STEP = ['bg-land-400', 'bg-land-500', 'bg-land-600', 'bg-land-700'];

/** The four tiers, as a comparison rather than four equal boxes. */
/** Since the 2024 split the two departments do different things. People post to the wrong one. */
export function WhoHandlesWhat() {
  const rows = [
    {
      dept: 'DLRRD',
      full: 'Land Reform and Rural Development',
      lead: 'Minister Mzwanele Nyhontso',
      items: [
        'Applications for advertised farms (Form ALA)',
        'Lease agreements, renewals and the option to purchase',
        'Deeds registration, property surveys and the SG code',
        'Beneficiary selection and the allocation committees',
      ],
    },
    {
      dept: 'DoA + provincial departments',
      full: 'Agriculture',
      lead: 'Minister John Steenhuisen',
      items: [
        'CASP and Ilima/Letsema input and infrastructure grants',
        'Extension officers and technical advice',
        'Blended Finance and the Agro Energy Fund, with the Land Bank',
        'Biosecurity, veterinary services and export market access',
      ],
    },
  ];

  return (
    <div className="grid gap-px border border-rule bg-rule lg:grid-cols-2">
      {rows.map((r) => (
        <div key={r.dept} className="bg-surface p-5">
          <p className="eyebrow">{r.dept}</p>
          <p className="mt-1 font-display text-xl leading-tight text-ink">Department of {r.full}</p>
          <p className="mt-0.5 text-xs text-muted">{r.lead}</p>
          <ul className="mt-3 space-y-1.5">
            {r.items.map((i) => (
              <li key={i} className="flex gap-2 text-sm text-ink">
                <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 bg-clay" />
                <span className="leading-snug">{i}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function CategoryTable() {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink text-left align-bottom">
              <th scope="col" className="eyebrow pb-2 font-normal">
                Category
              </th>
              <th scope="col" className="eyebrow pb-2 font-normal">
                Who it describes
              </th>
              <th scope="col" className="eyebrow pb-2 font-normal">
                Tenure
              </th>
              <th scope="col" className="eyebrow pb-2 font-normal">
                Rent
              </th>
              <th scope="col" className="eyebrow pb-2 font-normal">
                Can buy?
              </th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c, i) => (
              <tr key={c.id} className="border-b border-rule align-top">
                <th scope="row" className="py-4 pr-4 text-left font-normal">
                  <span className="flex items-baseline gap-2.5">
                    <span className={cx('mt-1 block h-8 w-1 shrink-0', CATEGORY_STEP[i])} />
                    <span>
                      <span className="block font-display text-lg leading-none text-ink">
                        {c.id}
                      </span>
                      <span className="mt-1 block text-ink">{c.name}</span>
                      <span className="num mt-1 block text-2xs text-muted">{c.turnover}</span>
                    </span>
                  </span>
                </th>
                <td className="max-w-[22rem] py-4 pr-4 leading-snug text-muted">{c.profile}</td>
                <td className="py-4 pr-4 leading-snug text-ink">{c.tenure}</td>
                <td className="py-4 pr-4 leading-snug text-ink">{c.rental}</td>
                <td className={cx('py-4 leading-snug', c.canBuy ? 'text-good' : 'text-muted')}>
                  {c.canBuy ? 'Yes, on performance' : 'No'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-reading text-sm leading-relaxed text-muted">
        <span className="num text-ink">{RENTAL_FORMULA.expression}</span> — {RENTAL_FORMULA.note}
      </p>
    </div>
  );
}

/** The committee chain, drawn to scale. */
export function ProcessSection() {
  const [openStage, setOpenStage] = useState<string | null>(STAGES[1].id);

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div>
        <ol className="space-y-1">
          {STAGES.map((stage) => {
            const open = openStage === stage.id;
            return (
              <li key={stage.id}>
                <button
                  type="button"
                  onClick={() => setOpenStage(open ? null : stage.id)}
                  aria-expanded={open}
                  className="w-full border-b border-rule py-3 text-left transition-colors hover:bg-clay-soft/30"
                >
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="eyebrow">{stage.actor}</span>
                    <span className="num shrink-0 text-2xs text-muted">{stage.duration}</span>
                  </span>
                  <span className="mt-1 block font-display text-lg leading-snug text-ink">
                    {stage.name}
                  </span>
                  <span
                    className={cx(
                      'mt-2 block h-2 origin-left transition-colors',
                      open ? 'bg-clay' : 'bg-land-300',
                    )}
                    style={{ width: `${(stage.days / TOTAL_DAYS) * 100}%`, minWidth: '8px' }}
                  />
                  {open && (
                    <span className="mt-3 block max-w-measure text-sm leading-relaxed text-muted">
                      {stage.detail}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-sm text-muted">
          About <span className="font-medium text-ink">{TOTAL_DAYS} days</span> from the advert closing to a
          signed lease, if nothing stalls.
        </p>

        <div className="mt-8">
          <Preflight />
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <p className="eyebrow">Form ALA</p>
          <p className="mt-1 font-display text-xl leading-tight text-ink">
            What the application asks for
          </p>
          <dl className="mt-3 space-y-3">
            {FORM_SECTIONS.map((s) => (
              <div key={s.name} className="border-t border-rule pt-2">
                <dt className="text-sm text-ink">{s.name}</dt>
                <dd className="mt-0.5 text-sm leading-snug text-muted">{s.detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="border-l-[3px] border-l-critical bg-clay-soft/40 p-4">
          <p className="eyebrow" style={{ color: 'rgb(var(--critical))' }}>
            Who may not apply
          </p>
          <ul className="mt-2 space-y-2">
            {EXCLUSIONS.map((e) => (
              <li key={e.id} className="text-sm">
                <span className="text-ink">{e.rule}</span>
                <span className="block leading-snug text-muted">{e.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 text-sm leading-relaxed text-muted">
          <p>{SUBMISSION_RULE}</p>
          <p className="text-ink">{RESIDENCE_RULE}</p>
        </div>

        <SgCode />
      </div>

    </div>
  );
}

export function FinanceSection() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div>
        <p className="lede">{COLLATERAL_PROBLEM}</p>

        <div className="mt-7 space-y-5">
          {FINANCE_TIERS.map((tier) => (
            <div key={tier.id} className="border-t border-rule pt-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <p className="font-display text-lg text-ink">{tier.producer}</p>
                <p className="num text-xs text-muted">{tier.turnover}</p>
              </div>
              <div
                className="mt-2 flex h-8 w-full overflow-hidden"
                role="img"
                aria-label={`${tier.grantPct} percent grant, ${tier.loanPct} percent loan, capped at ${tier.capLabel}`}
              >
                <span
                  className="flex items-center px-2 bg-land-600 text-xs font-medium text-paper"
                  style={{ width: `${tier.grantPct}%` }}
                >
                  {tier.grantPct}% grant
                </span>
                <span className="w-0.5 shrink-0 bg-surface" />
                <span
                  className="flex items-center px-2 bg-land-200 text-xs font-medium text-ink"
                  style={{ width: `${tier.loanPct}%` }}
                >
                  {tier.loanPct}% loan
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Maximum state grant <span className="font-medium text-ink">{tier.capLabel}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="mt-7 border-t border-ink pt-3">
          <p className="eyebrow">To qualify for blended finance</p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {BFS_CRITERIA.map((c) => (
              <li key={c} className="flex gap-2 text-sm text-ink">
                <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 bg-clay" />
                <span className="leading-snug">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        {SUPPORT_PROGRAMMES.map((p) => (
          <div key={p.name} className="border border-rule bg-surface p-4">
            <p className="eyebrow">{p.abbr ?? 'Programme'}</p>
            <p className="mt-1 font-display text-lg leading-tight text-ink">{p.name}</p>
            <p className="mt-1 text-xs text-muted">{p.runBy}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{p.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PolicySection() {
  return (
    <div>
      <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {POLICY_TIMELINE.map((era) => (
          <li key={era.name} className="border-t-2 border-ink pt-3">
            <p className="num text-2xs text-clay">{era.year}</p>
            <p className="mt-1 font-display text-lg leading-tight text-ink">
              {era.name}
              {era.abbr && <span className="ml-2 font-sans text-xs text-muted">{era.abbr}</span>}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{era.summary}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">{era.outcome}</p>
          </li>
        ))}
      </ol>

      <div className="mt-8 border-t border-rule pt-4">
        <p className="eyebrow">Land that came from other departments</p>
        <ul className="mt-2 grid gap-4 sm:grid-cols-2">
          {TRANSFERS.map((t) => (
            <li key={t.from} className="text-sm">
              <span className="figure block text-2xl">{group(t.hectares)}<span className="ml-1 font-sans text-sm font-normal text-muted">ha</span></span>
              <span className="mt-1 block text-ink">
                {t.from} — <span className="font-medium">{t.parcels}</span> parcels since {t.since}
              </span>
              <span className="block text-muted">{t.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CaseStudies() {
  return (
    <ol className="grid gap-8 lg:grid-cols-3">
      {CASE_STUDIES.map((c) => (
        <li key={c.id} className="border-t-2 border-ink pt-3">
          <p className="eyebrow">
            {PROVINCES[c.province as keyof typeof PROVINCES]?.name ?? c.province} · {c.scale}
          </p>
          <p className="mt-1 font-display text-xl leading-tight text-ink">{c.name}</p>
          <p className="mt-0.5 text-sm text-muted">{c.place}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">{c.what}</p>
          <p className="mt-3 border-l-2 border-clay pl-3 font-display text-base italic leading-snug text-ink">
            {c.lesson}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function RiskSection() {
  return (
    <ol className="grid gap-x-10 gap-y-7 lg:grid-cols-2">
      {RISKS.map((r, i) => (
        <li key={r.id} className="flex gap-4">
          <span className="num shrink-0 pt-1 text-2xs text-clay">{String(i + 1).padStart(2, '0')}</span>
          <div>
            <p className="font-display text-xl leading-tight text-ink">{r.title}</p>
            <p className="mt-2 max-w-measure text-sm leading-relaxed text-muted">{r.what}</p>
            <p className="mt-2 max-w-measure text-sm leading-relaxed text-ink">{r.soWhat}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Directory() {
  return (
    <div>
      <div className="grid gap-8 lg:grid-cols-2">
        {DEPARTMENTS.map((d) => (
          <div key={d.id} className="border-t-2 border-ink pt-3">
            <p className="eyebrow">{d.abbr}</p>
            <p className="mt-1 font-display text-xl leading-tight text-ink">{d.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{d.owns}</p>
            <dl className="mt-4 space-y-1.5 text-sm">
              <Line label="Minister" value={d.minister} />
              <Line label="Deputy" value={d.deputy} />
              <Line label="Director-General" value={d.dg} />
              <Line label="Switchboard" value={d.switchboard} mono />
              {d.enquiries && <Line label="Enquiries" value={d.enquiries} mono />}
              <div className="flex gap-3">
                <dt className="eyebrow w-32 shrink-0 pt-0.5">Email</dt>
                <dd>
                  <a
                    href={`mailto:${d.email}`}
                    className="break-all text-clay underline decoration-clay/30 underline-offset-4 hover:decoration-clay"
                  >
                    {d.email}
                  </a>
                </dd>
              </div>
              <Line label="Address" value={d.address} />
              {d.postal && <Line label="Postal" value={d.postal} />}
            </dl>
          </div>
        ))}
      </div>
      <p className="mt-8 max-w-reading border-l-2 border-clay pl-4 font-display text-lg italic leading-snug text-ink">
        {COORDINATION}
      </p>
    </div>
  );
}

function Line({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="eyebrow w-32 shrink-0 pt-0.5">{label}</dt>
      <dd className={cx('leading-snug text-ink', mono && 'num')}>{value}</dd>
    </div>
  );
}
