'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LiveStatus from './LiveStatus';
import Pathfinder from './Pathfinder';
import ProvincePanel from './ProvincePanel';
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
import { METRICS, type Metric, valueOf } from './LandScene';
import { CONTENT_REVIEWED, SOURCE_NOTE } from '@/content/meta';
import { ADVERTISED_FARMS, ADVERTISED_TOTAL_PUBLISHED, PROVINCE_ORDER } from '@/content/provinces';
import { cx, group } from '@/lib/format';
import { useLiveData } from '@/lib/useLiveData';
import type { Dataset, ProvinceCode } from '@/lib/types';

const LandScene = dynamic(() => import('./LandScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <p className="eyebrow animate-pulse">Building the terrain…</p>
    </div>
  ),
});

const THEME_KEY = 'all-theme';

type TabId = 'route' | 'process' | 'money' | 'history' | 'reality' | 'offices';

const TABS: { id: TabId; n: string; label: string }[] = [
  { id: 'route', n: '01', label: 'Your route' },
  { id: 'process', n: '02', label: 'Applying' },
  { id: 'money', n: '03', label: 'Money' },
  { id: 'history', n: '04', label: 'History' },
  { id: 'reality', n: '05', label: 'Reality' },
  { id: 'offices', n: '06', label: 'Offices' },
];

export default function LandLocator({ initial }: { initial: Dataset }) {
  const { dataset, state, changed, lastCheckedAt, refresh } = useLiveData(initial);
  const [province, setProvince] = useState<ProvinceCode | null>(null);
  const [metric, setMetric] = useState<Metric>('advertised');
  const [tab, setTab] = useState<TabId>('route');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [dark, setDark] = useState(false);
  const referenceRef = useRef<HTMLDivElement | null>(null);

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

  // Escape closes the province panel — the map is the thing, so give it back.
  useEffect(() => {
    if (!province) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProvince(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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

  const openTab = useCallback((id: TabId) => {
    setTab(id);
    referenceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const provinceAdverts = useMemo(
    () => (province ? adverts.filter((l) => l.province === province) : []),
    [adverts, province],
  );

  const active = METRICS.find((m) => m.id === metric)!;
  const leader = useMemo(() => {
    const ranked = [...PROVINCE_ORDER].sort(
      (a, b) => (valueOf(b, metric) ?? 0) - (valueOf(a, metric) ?? 0),
    );
    return ranked[0];
  }, [metric]);

  return (
    <div className="relative z-[1]">
      <header className="sticky top-0 z-40 border-b border-rule bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-[110rem] items-center justify-between gap-6 px-4 py-2.5 lg:px-6">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-lg leading-none text-ink">Asbonge</span>
            <span className="eyebrow hidden sm:inline">Land Locator</span>
          </div>

          <nav aria-label="Reference" className="-mx-1 min-w-0 flex-1 overflow-x-auto">
            <ul className="flex items-center justify-center gap-0.5 whitespace-nowrap">
              {TABS.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => openTab(t.id)}
                    className={cx(
                      'px-2.5 py-1 text-sm transition-colors',
                      tab === t.id ? 'text-ink' : 'text-muted hover:text-ink',
                    )}
                  >
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
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

      {/* The map is the page. */}
      <section
        id="map"
        className="relative h-[62vh] min-h-[26rem] w-full overflow-hidden border-b border-ink sm:h-[calc(100dvh-3.25rem)] sm:min-h-[34rem]"
      >
        <LandScene metric={metric} selected={province} onSelect={setProvince} dark={dark} />

        {/* Title lockup, kept to two lines. */}
        <div
          className={cx(
            'pointer-events-none absolute left-0 top-0 max-w-[34rem] p-5 transition-opacity duration-300 lg:p-8',
            province ? 'opacity-0' : 'opacity-100',
          )}
        >
          <h1 className="font-display text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[0.98] tracking-tight text-ink">
            The state owns the farm.
            <br />
            <span className="italic text-clay">You lease it.</span>
          </h1>
          <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-muted">
            {group(ADVERTISED_TOTAL_PUBLISHED)} hectares over {ADVERTISED_FARMS} state farms went out
            on 30-year leases. Height is the measure. Pick a province.
          </p>
          <button
            type="button"
            onClick={() => openTab('route')}
            className="btn-solid pointer-events-auto mt-4"
          >
            Which category am I?
          </button>
        </div>

        {/* Measure switcher. */}
        <div className="absolute right-4 top-4 lg:right-6 lg:top-6">
          <div className="border border-rule bg-paper/90 backdrop-blur">
            <div role="radiogroup" aria-label="Measure" className="flex p-1">
              {METRICS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={metric === m.id}
                  onClick={() => setMetric(m.id)}
                  className={cx(
                    'px-3 py-1.5 text-sm transition-colors',
                    metric === m.id ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="max-w-[16rem] border-t border-rule px-2 py-1.5 text-2xs leading-snug text-muted">
              {active.note}
            </p>
          </div>
        </div>

        {/* Reading key. */}
        <div className="pointer-events-none absolute bottom-4 left-4 lg:bottom-6 lg:left-8">
          <p className="eyebrow">Tallest · {active.label.toLowerCase()}</p>
          <p className="mt-0.5 font-display text-xl leading-none text-ink">
            {leader}
            <span className="ml-2 font-sans text-sm font-normal text-muted">
              {(() => {
                const v = valueOf(leader, metric);
                return v === null ? '—' : metric === 'share' ? `${v}%` : `${group(v)} ha`;
              })()}
            </span>
          </p>
          <p className="mt-2 max-w-[24ch] text-2xs leading-snug text-muted">
            Drag to orbit · scroll to zoom · click a province
          </p>
        </div>

        {/* Province panel. */}
        <div
          className={cx(
            'pointer-events-none absolute inset-y-0 right-0 w-full transition-transform duration-500 ease-out sm:w-[26rem]',
            province ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          {province && (
            <ProvincePanel
              code={province}
              adverts={provinceAdverts}
              openIds={openIds}
              onToggle={toggleOpen}
              onClose={() => setProvince(null)}
              onOpenOffices={() => openTab('offices')}
            />
          )}
        </div>
      </section>

      {/* Everything else, one panel at a time. */}
      <div ref={referenceRef} className="scroll-mt-14">
        <div className="sticky top-[3.25rem] z-30 border-b border-rule bg-paper/90 backdrop-blur">
          <div className="mx-auto max-w-[110rem] overflow-x-auto px-4 lg:px-6">
            <div role="tablist" aria-label="Reference" className="flex gap-1 whitespace-nowrap py-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cx(
                    'flex items-baseline gap-2 border-b-2 px-3 py-2 text-sm transition-colors',
                    tab === t.id
                      ? 'border-clay text-ink'
                      : 'border-transparent text-muted hover:text-ink',
                  )}
                >
                  <span className="num text-2xs text-faint">{t.n}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[110rem] px-4 pb-20 pt-10 lg:px-6">
          <Panel id="route" tab={tab} title="Which category are you?">
            <Pathfinder onProvinceChange={setProvince} />
          </Panel>

          <Panel id="process" tab={tab} title="Applying">
            <WhoHandlesWhat />
            <div className="mt-10">
              <ProcessSection />
            </div>
            <div className="mt-12">
              <h3 className="font-display text-opener leading-tight text-ink">The four categories</h3>
              <div className="mt-4">
                <CategoryTable />
              </div>
            </div>
          </Panel>

          <Panel id="money" tab={tab} title="Money">
            <FinanceSection />
          </Panel>

          <Panel id="history" tab={tab} title="History">
            <PolicySection />
            <div className="mt-12">
              <h3 className="font-display text-opener leading-tight text-ink">What has worked</h3>
              <div className="mt-5">
                <CaseStudies />
              </div>
            </div>
          </Panel>

          <Panel id="reality" tab={tab} title="What goes wrong">
            <RiskSection />
          </Panel>

          <Panel id="offices" tab={tab} title="Offices">
            <Directory />
            <div className="mt-12">
              <h3 className="font-display text-opener leading-tight text-ink">
                Hectares by province
              </h3>
              <div className="mt-4">
                <ProvinceRanking
                  selected={province}
                  onSelect={(code) => {
                    setProvince(code);
                    document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              </div>
            </div>
          </Panel>
        </main>
      </div>

      <footer className="border-t border-ink">
        <div className="mx-auto max-w-[110rem] px-4 py-7 lg:px-6">
          <p className="max-w-reading text-sm leading-relaxed text-muted">{SOURCE_NOTE}</p>
          <p className="eyebrow mt-4">
            Reviewed {CONTENT_REVIEWED} · nothing here is an offer · dataset{' '}
            <span className="num">{dataset.revision}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

function Panel({
  id,
  tab,
  title,
  children,
}: {
  id: TabId;
  tab: TabId;
  title: string;
  children: React.ReactNode;
}) {
  if (tab !== id) return null;
  return (
    <section
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={-1}
      className="animate-rise"
    >
      <div className="opener">
        <h2 className="font-display text-opener leading-none text-ink">{title}</h2>
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}
