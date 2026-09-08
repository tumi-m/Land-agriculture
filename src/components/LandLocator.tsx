'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import LiveStatus from './LiveStatus';
import MapCanvas from './MapCanvas';
import Pathfinder from './Pathfinder';
import ProvinceDossier from './ProvinceDossier';
import ProvinceRanking from './ProvinceRanking';
import {
  CaseStudies,
  CategoryTable,
  Directory,
  FinanceSection,
  PolicySection,
  ProcessSection,
  RiskSection,
  WhoHandlesWhat,
} from './Sections';
import { CONTENT_REVIEWED, SOURCE_NOTE } from '@/content/meta';
import { NATIONAL_FIGURES } from '@/content/policy';
import {
  ADVERTISED_FARMS,
  ADVERTISED_TOTAL_PUBLISHED,
  PROVINCES,
  PROVINCE_ORDER,
  RELEASED_PRODUCERS,
  RELEASED_SPLIT,
  RELEASED_TOTAL,
} from '@/content/provinces';
import { cx, group } from '@/lib/format';
import { useLiveData } from '@/lib/useLiveData';
import type { Dataset, ProvinceCode } from '@/lib/types';

const THEME_KEY = 'all-theme';

const SECTIONS = [
  { id: 'land', n: '01', label: 'The land' },
  { id: 'route', n: '02', label: 'Your route' },
  { id: 'process', n: '03', label: 'The process' },
  { id: 'money', n: '04', label: 'The money' },
  { id: 'history', n: '05', label: 'How we got here' },
  { id: 'reality', n: '06', label: 'What goes wrong' },
  { id: 'offices', n: '07', label: 'Offices' },
];

export default function LandLocator({ initial }: { initial: Dataset }) {
  const { dataset, state, changed, lastCheckedAt, refresh } = useLiveData(initial);
  const [province, setProvince] = useState<ProvinceCode | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dark, setDark] = useState(false);

  const hasFeed = dataset.source === 'remote';
  const adverts = useMemo(() => (hasFeed ? dataset.listings : []), [hasFeed, dataset.listings]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('province')?.toUpperCase();
    if (code && (PROVINCE_ORDER as string[]).includes(code)) setProvince(code as ProvinceCode);
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (province) url.searchParams.set('province', province);
    else url.searchParams.delete('province');
    window.history.replaceState(null, '', url);
  }, [province]);

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
      /* private mode — the toggle still works for this session */
    }
  };

  const provinceAdverts = useMemo(
    () => (province ? adverts.filter((l) => l.province === province) : adverts),
    [adverts, province],
  );

  const jumpToLand = useCallback((code: ProvinceCode) => {
    setProvince(code);
    document.getElementById('land')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="relative z-[1]">
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-[92rem] flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-2.5 lg:px-8">
          <a href="#top" className="flex items-baseline gap-2.5">
            <span className="font-display text-lg leading-none text-ink">Asbonge</span>
            <span className="eyebrow">Land Locator</span>
          </a>

          <nav aria-label="Sections" className="order-3 -mx-1 w-full overflow-x-auto lg:order-2 lg:w-auto">
            <ul className="flex items-center gap-1 whitespace-nowrap">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex items-baseline gap-1.5 px-2 py-1 text-sm text-muted transition-colors hover:text-ink"
                  >
                    <span className="num text-2xs text-faint">{s.n}</span>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="order-2 flex items-center gap-4 lg:order-3">
            <LiveStatus
              dataset={dataset}
              state={state}
              changed={changed}
              lastCheckedAt={lastCheckedAt}
              onRefresh={refresh}
            />
            <button
              type="button"
              onClick={toggleTheme}
              className="btn px-2.5 py-1.5"
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {dark ? '☀' : '☾'}
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-[92rem] px-4 pb-24 lg:px-8">
        {/* Hero */}
        <section className="grid gap-x-12 gap-y-8 pb-10 pt-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:pt-16">
          <div>
            <p className="eyebrow">State agricultural land · South Africa</p>
            <h1 className="mt-4 font-display text-display text-ink">
              The state owns the farm.
              <br />
              <span className="italic text-clay">You lease it.</span>
            </h1>
            <p className="lede mt-6">
              Since 2006 the government buys farms and keeps the title deed. What it hands out is a
              lease — for R1 a year or for 2% of the farm’s agricultural value, depending on which of
              four categories it puts you in. This page sets out where that land is, how the
              allocation is decided, what it costs, and what tends to go wrong.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <a href="#route" className="btn-solid">
                Find your route
              </a>
              <a href="#land" className="btn">
                See the map
              </a>
            </div>
          </div>

          <div className="self-end">
            <p className="eyebrow">October 2020 land release</p>
            <p className="figure mt-2 text-[clamp(3rem,7vw,4.5rem)] leading-[0.9]">
              {group(ADVERTISED_TOTAL_PUBLISHED)}
              <span className="ml-2 font-sans text-lg font-normal text-muted">hectares</span>
            </p>
            <p className="mt-2 max-w-measure text-sm leading-relaxed text-muted">
              advertised across <span className="font-medium text-ink">{ADVERTISED_FARMS}</span> state-owned
              farms in seven provinces, on 30-year leases. Earlier that year{' '}
              <span className="font-medium text-ink">{group(RELEASED_TOTAL)} ha</span> went to{' '}
              <span className="font-medium text-ink">{RELEASED_PRODUCERS}</span> producers —{' '}
              {RELEASED_SPLIT.women} women, {RELEASED_SPLIT.youth} young people and one person with a
              disability.
            </p>
          </div>
        </section>

        <dl className="grid gap-px border-y border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {NATIONAL_FIGURES.filter((f) => !f.label.startsWith('Advertised')).map((f) => (
            <div key={f.label} className="bg-paper px-4 py-4">
              <dt className="eyebrow min-h-[2.2em]">{f.label}</dt>
              <dd className="figure mt-1.5 text-2xl">{f.value}</dd>
              <dd className="mt-1.5 text-xs leading-relaxed text-muted">{f.detail}</dd>
            </div>
          ))}
        </dl>

        {/* 01 The land */}
        <Section id="land" n="01" title="Where the land is">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
            <div className="lg:sticky lg:top-20 lg:self-start">
              <div className="h-[52vh] overflow-hidden border border-rule bg-surface sm:h-[62vh] lg:h-[min(74vh,46rem)]">
                <MapCanvas
                  selected={province}
                  onSelectProvince={(code) => {
                    setProvince(code);
                    setActiveId(null);
                  }}
                  adverts={adverts}
                  activeAdvertId={activeId}
                  onSelectAdvert={(id) => setActiveId(id)}
                />
              </div>
            </div>

            <div className="min-w-0">
              {province ? (
                <ProvinceDossier
                  code={province}
                  adverts={provinceAdverts}
                  openIds={openIds}
                  onToggle={toggleOpen}
                  onClose={() => setProvince(null)}
                />
              ) : (
                <>
                  <p className="lede">
                    Half of KwaZulu-Natal’s registered surface is state land; the Free State’s is
                    seven per cent. That, more than anything, decides where a lease is realistic.
                    Pick a province on the map or in the table.
                  </p>
                  <div className="mt-6">
                    <ProvinceRanking selected={province} onSelect={setProvince} />
                  </div>
                </>
              )}
            </div>
          </div>
        </Section>

        {/* 02 Route */}
        <Section
          id="route"
          n="02"
          title="Which category are you?"
          standfirst="The answer decides your lease length, your rent, whether you can ever own the land, and how much of your finance is a grant. Four questions, and the route below assembles itself."
        >
          <Pathfinder onProvinceChange={jumpToLand} />
        </Section>

        {/* 03 Process */}
        <Section
          id="process"
          n="03"
          title="What happens to your form"
          standfirst="Sealed envelope, tender box, then three committees. The categories set the terms; the committees decide who gets them — and since 2024 the land and the support for it come from two different departments."
        >
          <WhoHandlesWhat />
          <div className="mt-12">
            <ProcessSection />
          </div>
          <div className="mt-12">
            <h3 className="font-display text-opener leading-tight text-ink">The four categories</h3>
            <div className="mt-5">
              <CategoryTable />
            </div>
          </div>
        </Section>

        {/* 04 Money */}
        <Section
          id="money"
          n="04"
          title="Why the grants exist"
          standfirst="A lease you cannot pledge is a lease no bank will lend against. Everything in this section is the state working around that."
        >
          <FinanceSection />
        </Section>

        {/* 05 History */}
        <Section
          id="history"
          n="05"
          title="How the state became the landlord"
          standfirst="Three decades of policy, and the reason you are offered a lease rather than a title deed."
        >
          <PolicySection />
          <div className="mt-14">
            <h3 className="font-display text-opener leading-tight text-ink">What has worked</h3>
            <div className="mt-6">
              <CaseStudies />
            </div>
          </div>
        </Section>

        {/* 06 Reality */}
        <Section
          id="reality"
          n="06"
          title="What goes wrong"
          standfirst="Worth knowing before you spend money on a farm you do not own."
        >
          <RiskSection />
        </Section>

        {/* 07 Offices */}
        <Section
          id="offices"
          n="07"
          title="Who to talk to"
          standfirst="Land comes from one department, the support that makes it productive from another. You will deal with both."
        >
          <Directory />
          <div className="mt-12">
            <h3 className="font-display text-opener leading-tight text-ink">
              Provincial shared service centres
            </h3>
            <p className="lede mt-3">
              Applications go to the centre for the district where the farm is. Pick a province for
              its address, switchboard and the officials who handle allocation.
            </p>
            <ul className="mt-6 grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
              {PROVINCE_ORDER.map((code) => {
                const p = PROVINCES[code];
                return (
                  <li key={code}>
                    <button
                      type="button"
                      onClick={() => jumpToLand(code)}
                      className={cx(
                        'flex h-full w-full flex-col items-start gap-1 bg-surface p-4 text-left transition-colors hover:bg-clay-soft/40',
                      )}
                    >
                      <span className="font-display text-lg leading-none text-ink">{p.name}</span>
                      <span className="num text-2xs text-muted">
                        {p.pssc.phones[0]} · {p.pssc.officials.length} contacts
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs leading-snug text-muted">
                        {p.pssc.address}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Section>
      </main>

      <footer className="border-t border-ink">
        <div className="mx-auto max-w-[92rem] px-4 py-8 lg:px-8">
          <p className="max-w-reading text-sm leading-relaxed text-muted">{SOURCE_NOTE}</p>
          <p className="mt-3 max-w-reading text-sm leading-relaxed text-ink">
            No application is ever charged for on this site, and nothing here is an offer. Confirm
            every figure, closing date and contact with the department before you act on it.
          </p>
          <p className="eyebrow mt-5">
            Content reviewed {CONTENT_REVIEWED} · boundaries: 52 district municipalities, simplified
            · dataset revision <span className="num">{dataset.revision}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

function Section({
  id,
  n,
  title,
  standfirst,
  children,
}: {
  id: string;
  n: string;
  title: string;
  standfirst?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 pt-16 lg:pt-24">
      <div className="opener">
        <span className="num text-2xs text-clay">{n}</span>
        <h2 className="font-display text-opener leading-none text-ink">{title}</h2>
      </div>
      {standfirst && <p className="lede mt-4 max-w-reading">{standfirst}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}
