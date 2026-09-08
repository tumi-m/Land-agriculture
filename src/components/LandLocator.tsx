"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LAND_JOURNEY } from "@/content/journey";
import { JourneyNarration, JourneyTimeline } from "./LandJourney";
import LiveStatus from "./LiveStatus";
import Pathfinder from "./Pathfinder";
import ProvincePanel from "./ProvincePanel";
import ProvinceRanking from "./ProvinceRanking";
import {
  CaseStudies,
  CategoryTable,
  Directory,
  FinanceSection,
  PolicySection,
  ProcessSection,
  RiskSection,
  WhoHandlesWhat,
} from "./Sections";
import {
  METRICS,
  type Metric,
  valueOf,
  rankProvinces,
} from "@/lib/land-metrics";
import { CONTENT_REVIEWED, SOURCE_NOTE } from "@/content/meta";
import {
  ADVERTISED_FARMS,
  ADVERTISED_TOTAL_PUBLISHED,
  PROVINCES,
  PROVINCE_ORDER,
} from "@/content/provinces";
import { cx, group } from "@/lib/format";
import { useLiveData } from "@/lib/useLiveData";
import type { Dataset, ProvinceCode } from "@/lib/types";

const LandScene = dynamic(() => import("./LandScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <p className="eyebrow animate-pulse">Building the terrain…</p>
    </div>
  ),
});

const THEME_KEY = "all-theme";

type TabId = "route" | "process" | "money" | "history" | "reality" | "offices";

const TABS: { id: TabId; n: string; label: string }[] = [
  { id: "route", n: "01", label: "Your route" },
  { id: "process", n: "02", label: "Applying" },
  { id: "money", n: "03", label: "Money" },
  { id: "history", n: "04", label: "History" },
  { id: "reality", n: "05", label: "Reality" },
  { id: "offices", n: "06", label: "Offices" },
];

export default function LandLocator({ initial }: { initial: Dataset }) {
  const { dataset, state, changed, lastCheckedAt, refresh } =
    useLiveData(initial);
  const [guided, setGuided] = useState(true);
  const [chapter, setChapter] = useState(0);
  const [province, setProvince] = useState<ProvinceCode | null>(null);
  const [metric, setMetric] = useState<Metric>("advertised");
  const [tab, setTab] = useState<TabId>("route");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const [urlReady, setUrlReady] = useState(false);
  const referenceRef = useRef<HTMLDivElement | null>(null);

  const hasFeed = dataset.source === "remote";
  const adverts = useMemo(
    () => (hasFeed ? dataset.listings : []),
    [hasFeed, dataset.listings],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("province")?.toUpperCase();
    if (code && (PROVINCE_ORDER as string[]).includes(code)) {
      setProvince(code as ProvinceCode);
      setGuided(false);
    }
    setDark(document.documentElement.classList.contains("dark"));
    setUrlReady(true);
  }, []);

  useEffect(() => {
    if (!urlReady) return;
    const url = new URL(window.location.href);
    if (province) url.searchParams.set("province", province);
    else url.searchParams.delete("province");
    window.history.replaceState(null, "", url);
  }, [province, urlReady]);

  // Escape closes the province panel — the map is the thing, so give it back.
  useEffect(() => {
    if (!province) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProvince(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* private mode — the toggle still works for this session */
    }
  };

  const openTab = useCallback((id: TabId) => {
    setTab(id);
    referenceRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const provinceAdverts = useMemo(
    () => (province ? adverts.filter((l) => l.province === province) : []),
    [adverts, province],
  );

  const step = LAND_JOURNEY[chapter];
  const displayMetric = guided ? step.metric : metric;
  const active = METRICS.find((m) => m.id === displayMetric)!;
  const exploreJourney = () => {
    setMetric(step.metric);
    setProvince(step.province);
    setGuided(false);
  };

  return (
    <div className="relative z-[1]">
      <header className="app-header">
        <a className="brand" href="#map" aria-label="Asbonge Land Locator home">
          <span className="brand-mark" aria-hidden="true">
            A<span>↗</span>
          </span>
          <span>
            asbonge<span className="brand-sub">LAND & OPPORTUNITY</span>
          </span>
        </a>
        <nav aria-label="Main navigation" className="main-nav">
          <a
            href="#map"
            className="nav-current"
            onClick={() => setGuided(false)}
          >
            Explore land
          </a>
          <button onClick={() => openTab("process")}>How to apply</button>
          <button onClick={() => openTab("money")}>Funding & support</button>
        </nav>
        <div className="header-actions">
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {dark ? "☀" : "☾"}
          </button>
          <button
            className="btn-solid route-cta"
            onClick={() => openTab("route")}
          >
            Find my route <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      <div className={cx("workspace", guided && "guided-workspace")}>
        <section className="explorer-intro" aria-labelledby="explorer-title">
          <div>
            <p className="eyebrow">
              <span className="status-dot" /> SOUTH AFRICA · AGRICULTURAL LAND
              EXPLORER
            </p>
            <h1 id="explorer-title">
              Find your <em>ground.</em>
            </h1>
            <p>
              Understand the land. Explore your options. Take your next step
              into farming.
            </p>
          </div>
          <div className="intro-note">
            <span aria-hidden="true">↗</span>
            <p>
              From province to possibility.
              <br />
              <strong>A practical guide to state land.</strong>
            </p>
          </div>
        </section>

        <section
          className="stat-strip"
          style={guided ? { display: "none" } : undefined}
          aria-label="Historical national land release overview"
        >
          <div>
            <span className="stat-icon" aria-hidden="true">
              ▧
            </span>
            <div>
              <p className="eyebrow">HECTARES ADVERTISED</p>
              <p className="stat-value">
                {group(ADVERTISED_TOTAL_PUBLISHED)} <small>ha</small>
              </p>
              <p className="stat-caption">Published October 2020 total</p>
            </div>
          </div>
          <div>
            <span className="stat-icon" aria-hidden="true">
              ⌖
            </span>
            <div>
              <p className="eyebrow">STATE FARMS</p>
              <p className="stat-value">{ADVERTISED_FARMS}</p>
              <p className="stat-caption">In the October 2020 announcement</p>
            </div>
          </div>
          <div>
            <span className="stat-icon" aria-hidden="true">
              ◷
            </span>
            <div>
              <p className="eyebrow">LEASE FRAMEWORK</p>
              <p className="stat-value">
                30 <small>years</small>
              </p>
              <p className="stat-caption">
                Terms depend on beneficiary category
              </p>
            </div>
          </div>
          <button className="stat-action" onClick={() => openTab("route")}>
            <span className="eyebrow">YOUR STARTING POINT</span>
            <strong>What could my route look like?</strong>
            <span>
              Answer four questions <span aria-hidden="true">↗</span>
            </span>
          </button>
        </section>

        <section
          id="map"
          className={cx("explorer-shell", guided && "journey-shell")}
          aria-label="Explore South African provinces"
        >
          <div className="explorer-toolbar">
            <div>
              <h2>{guided ? "The land journey" : "Explore the landscape"}</h2>
              <p>
                {guided
                  ? "One map. Five steps from understanding to action."
                  : "Choose a measure, then select a province."}
              </p>
            </div>
            <div
              className="explorer-mode"
              role="group"
              aria-label="Explorer mode"
            >
              <button
                type="button"
                aria-pressed={guided}
                onClick={() => setGuided(true)}
              >
                Guided journey
              </button>
              <button
                type="button"
                aria-pressed={!guided}
                onClick={() => setGuided(false)}
              >
                Explore freely
              </button>
            </div>
            <div
              role="group"
              aria-label="Map measure"
              className="metric-switch"
            >
              {METRICS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={displayMetric === m.id}
                  onClick={() => {
                    setMetric(m.id);
                    setGuided(false);
                  }}
                  className={cx(displayMetric === m.id && "is-active")}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="explorer-body">
            {!guided && (
              <aside
                className="province-browser"
                aria-label="Province selector"
              >
                <label className="province-search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    aria-label="Search provinces or farming commodities"
                    placeholder="Province or crop…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <div className="ranking-label">
                  <span>PROVINCE</span>
                  <span>{metric === "share" ? "STATE SHARE" : "HECTARES"}</span>
                </div>
                <div className="province-list">
                  {rankProvinces(metric, query).map((code) => {
                    const value = valueOf(code, metric);
                    const max = Math.max(
                      ...PROVINCE_ORDER.map((c) => valueOf(c, metric) ?? 0),
                      1,
                    );
                    return (
                      <button
                        key={code}
                        className={cx(
                          "province-row",
                          province === code && "is-selected",
                        )}
                        aria-pressed={province === code}
                        onClick={() =>
                          setProvince(province === code ? null : code)
                        }
                      >
                        <span className="province-row-title">
                          <span>{PROVINCES[code].name}</span>
                          <strong>
                            {value === null
                              ? "—"
                              : metric === "share"
                                ? `${value}%`
                                : group(value)}
                          </strong>
                        </span>
                        <span className="province-bar">
                          <span
                            style={{ width: `${((value ?? 0) / max) * 100}%` }}
                          />
                        </span>
                      </button>
                    );
                  })}
                  {rankProvinces(metric, query).length === 0 && (
                    <div className="search-empty">
                      <p>No matching province or crop.</p>
                      <button className="btn mt-3" onClick={() => setQuery("")}>
                        Clear search
                      </button>
                    </div>
                  )}
                </div>
                <div className="province-browser-note">
                  <span className="status-dot" />
                  <p>
                    All 9 provinces. Select one for farming systems and the
                    local application office.
                  </p>
                </div>
              </aside>
            )}
            {guided && (
              <JourneyNarration
                chapter={chapter}
                onExplore={exploreJourney}
                onRoute={() => openTab("route")}
              />
            )}
            <div className="map-stage">
              <div className="map-heading">
                <span className="map-badge">3D DATA MAP</span>
                <span>ZA / 09 PROVINCES</span>
              </div>
              <LandScene
                metric={displayMetric}
                selected={guided ? step.province : province}
                narrationOverlay={guided}
                onSelect={(code) => {
                  setMetric(displayMetric);
                  setProvince(code);
                  setGuided(false);
                }}
                dark={dark}
              />
              <div className="map-legend">
                <div>
                  <span className="legend-ramp" />
                  <span>Lower</span>
                  <span>Higher</span>
                </div>
                <p>
                  Height & colour show {active.label.toLowerCase()}.<br />
                  This is a data model, not terrain elevation.
                </p>
              </div>
            </div>
            {province && !guided && (
              <div className="province-detail">
                <ProvincePanel
                  code={province}
                  adverts={provinceAdverts}
                  openIds={openIds}
                  onToggle={toggleOpen}
                  onClose={() => setProvince(null)}
                  onOpenOffices={() => openTab("offices")}
                  hasFeed={hasFeed}
                />
              </div>
            )}
          </div>
          {guided && (
            <JourneyTimeline chapter={chapter} onChange={setChapter} />
          )}
          <div className="explorer-footnote">
            <p>
              <strong>
                {displayMetric === "advertised"
                  ? "October 2020"
                  : displayMetric === "released"
                    ? "February 2020"
                    : "Historical land audit"}
                .
              </strong>{" "}
              {active.note} These figures do not indicate current availability.
              {displayMetric === "released" &&
                " The February and October figures are separate rounds."}
            </p>
            <LiveStatus
              dataset={dataset}
              state={state}
              changed={changed}
              lastCheckedAt={lastCheckedAt}
              onRefresh={refresh}
            />
          </div>
        </section>

        <section className="next-steps" aria-label="Plan your next step">
          <button onClick={() => openTab("route")}>
            <span className="step-number">01</span>
            <div>
              <h3>Find your fit</h3>
              <p>Your farming plans, category and lease options.</p>
            </div>
            <span aria-hidden="true">↗</span>
          </button>
          <button onClick={() => openTab("process")}>
            <span className="step-number">02</span>
            <div>
              <h3>Build your application</h3>
              <p>The process, Form ALA and a document checklist.</p>
            </div>
            <span aria-hidden="true">↗</span>
          </button>
          <button onClick={() => openTab("money")}>
            <span className="step-number">03</span>
            <div>
              <h3>Plan the funding</h3>
              <p>Understand grants, loans and farmer support.</p>
            </div>
            <span aria-hidden="true">↗</span>
          </button>
        </section>
      </div>

      {/* Everything else, one panel at a time. */}
      <div ref={referenceRef} className="reference-area scroll-mt-24">
        <div className="sticky top-[4.5rem] z-30 border-b border-rule bg-paper/90 backdrop-blur">
          <div className="mx-auto max-w-[96rem] overflow-x-auto px-4 lg:px-6">
            <div
              role="tablist"
              aria-label="Reference"
              className="flex gap-1 whitespace-nowrap py-1"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  type="button"
                  onClick={() => setTab(t.id)}
                  tabIndex={tab === t.id ? 0 : -1}
                  onKeyDown={(event) => {
                    const current = TABS.findIndex((item) => item.id === t.id);
                    const next =
                      event.key === "ArrowRight"
                        ? (current + 1) % TABS.length
                        : event.key === "ArrowLeft"
                          ? (current - 1 + TABS.length) % TABS.length
                          : event.key === "Home"
                            ? 0
                            : event.key === "End"
                              ? TABS.length - 1
                              : -1;
                    if (next < 0) return;
                    event.preventDefault();
                    setTab(TABS[next].id);
                    document.getElementById(`tab-${TABS[next].id}`)?.focus();
                  }}
                  className={cx(
                    "flex items-baseline gap-2 border-b-2 px-3 py-2 text-sm transition-colors",
                    tab === t.id
                      ? "border-clay text-ink"
                      : "border-transparent text-muted hover:text-ink",
                  )}
                >
                  <span className="num text-2xs text-faint">{t.n}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[96rem] px-4 pb-20 pt-10 lg:px-6">
          <Panel id="route" tab={tab} title="Which category are you?">
            <Pathfinder
              onProvinceChange={(code) => {
                setProvince(code);
                setGuided(false);
              }}
              selectedProvince={guided ? null : province}
            />
          </Panel>

          <Panel id="process" tab={tab} title="Applying">
            <WhoHandlesWhat />
            <div className="mt-10">
              <ProcessSection />
            </div>
            <div className="mt-12">
              <h3 className="font-display text-opener leading-tight text-ink">
                The four categories
              </h3>
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
              <h3 className="font-display text-opener leading-tight text-ink">
                What has worked
              </h3>
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
                    document
                      .getElementById("map")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                />
              </div>
            </div>
          </Panel>
        </main>
      </div>

      <footer className="border-t border-ink">
        <div className="mx-auto max-w-[96rem] px-4 py-7 lg:px-6">
          <p className="max-w-reading text-sm leading-relaxed text-muted">
            {SOURCE_NOTE}
          </p>
          <p className="eyebrow mt-4">
            Reviewed {CONTENT_REVIEWED} · nothing here is an offer · dataset{" "}
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
  return (
    <section
      hidden={tab !== id}
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={-1}
      className="animate-rise"
    >
      <div className="opener">
        <h2 className="font-display text-opener leading-none text-ink">
          {title}
        </h2>
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}
