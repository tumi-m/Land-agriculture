"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parcelFor } from "@/lib/cadastre";
import { onThemeChange } from "@/lib/tokens";
import LandDossier, { NoticeBrowser } from "./LandDossier";
import { FARM_NOTICES, type FarmNotice } from "@/content/farm-notices";
import {
  toggleDetailState,
  type DetailState,
  type MapInspection,
} from "@/lib/map-selection";
import { useExplorer, parentOf } from "@/state/explorer";
import { readUrlState, writeUrlState } from "@/state/url";
import LiveStatus from "./LiveStatus";
import ProvincePanel from "./ProvincePanel";
import {
  METRICS,
  valueOf,
  rankProvinces,
} from "@/lib/land-metrics";
import { CONTENT_REVIEWED, SOURCE_NOTE } from "@/content/meta";
import { PROVINCES, PROVINCE_ORDER } from "@/content/provinces";
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

const ExplodedMap = dynamic(() => import("./ExplodedMap"), { ssr: false });

const AtlasMap = dynamic(() => import("./AtlasMap"), { ssr: false });

const THEME_KEY = "all-theme";

export default function LandLocator({ initial }: { initial: Dataset }) {
  const { dataset, state, changed, lastCheckedAt, refresh } =
    useLiveData(initial);
  // The explorer's spine: selection, view and metric. Detail panel state,
  // focus/compact chrome and the search box stay local — they are view
  // concerns, not shareable state.
  const view = useExplorer((s) => s.view);
  const selection = useExplorer((s) => s.selection);
  const metric = useExplorer((s) => s.metric);
  const openIds = useExplorer((s) => s.openIds);
  const setView = useExplorer((s) => s.setView);
  const setMetric = useExplorer((s) => s.setMetric);
  const selectProvince = useExplorer((s) => s.selectProvince);
  const selectDistrict = useExplorer((s) => s.selectDistrict);
  const selectNotice = useExplorer((s) => s.selectNotice);
  const selectPoint = useExplorer((s) => s.selectPoint);
  const toggleOpen = useExplorer((s) => s.toggleOpen);

  // View-only state, outside the store on purpose.
  const [notice, setNotice] = useState<FarmNotice | null>(null);
  const [inspection, setInspection] = useState<MapInspection | null>(null);
  const [detailState, setDetailState] = useState<DetailState>("expanded");
  const [focusMap, setFocusMap] = useState(false);
  const [compactMap, setCompactMap] = useState(false);
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const [urlReady, setUrlReady] = useState(false);

  // The store is the truth for province/district; these are derived reads.
  const province =
    selection.kind === "province" || selection.kind === "district"
      ? selection.province
      : null;
  const district =
    selection.kind === "district" || selection.kind === "layer"
      ? selection.district
      : null;
  const setDistrict = (id: string | null) => {
    if (province) selectDistrict(province, id);
  };

  const hasFeed = dataset.source === "remote";
  const adverts = useMemo(
    () => (hasFeed ? dataset.listings : []),
    [hasFeed, dataset.listings],
  );

  const chooseNotice = useCallback(
    (item: FarmNotice) => {
      setNotice(item);
      const parcel = parcelFor(item.id);
      setInspection(
        parcel
          ? { coordinates: parcel.properties.coordinates, elevation: null }
          : null,
      );
      selectProvince(item.province);
      setFocusMap(false);
      setView("atlas");
      setDetailState("expanded");
      setCompactMap(false);
    },
    [selectProvince, setView],
  );
  // The URL hydrator runs before chooseNotice exists in its deps; a ref keeps
  // the once-only effect stable.
  const chooseNoticeRef = useRef(chooseNotice);
  chooseNoticeRef.current = chooseNotice;

  const inspectPoint = useCallback((point: MapInspection) => {
    setInspection(point);
    setNotice(null);
    setFocusMap(false);
    setCompactMap(false);
    setDetailState("expanded");
  }, []);
  const inspectInfrastructure = useCallback(
    () => setDetailState("collapsed"),
    [],
  );
  const chooseProvince = useCallback(
    (code: ProvinceCode | null) => {
      selectProvince(code);
      setNotice(null);
      setInspection(null);
      setDetailState("expanded");
    },
    [selectProvince],
  );
  const chooseDistrict = useCallback(
    (id: string | null) => {
      if (!province) return;
      selectDistrict(province, id);
      setNotice(null);
      setInspection(null);
      setDetailState("expanded");
    },
    [province, selectDistrict],
  );

  // The theme and URL hydrate in the effect below (store-backed).
  // Hydrate from the URL once on mount, then keep it in step (debounced).
  useEffect(() => {
    const { at, view: urlView, metric: urlMetric } = readUrlState(
      window.location.search,
    );
    if (at.kind !== "country") {
      if (at.kind === "province") selectProvince(at.province);
      else if (at.kind === "district") selectDistrict(at.province, at.district);
      else if (at.kind === "notice") {
        selectNotice(at.id);
        const item = FARM_NOTICES.find((n) => n.id === at.id);
        if (item) chooseNoticeRef.current(item);
      } else if (at.kind === "point") {
        selectPoint({ lng: at.lng, lat: at.lat });
        setInspection({ coordinates: [at.lng, at.lat], elevation: null });
      }
    }
    if (urlView !== "anatomy") setView(urlView);
    if (urlMetric !== "advertised") setMetric(urlMetric);
    // Follows the `dark` class live, so WebGL readers of the tokens stay
    // in step when the theme flips without a remount.
    const stopTheme = onThemeChange(() => {
      setDark(document.documentElement.classList.contains("dark"));
    });
    setUrlReady(true);
    return stopTheme;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once
  }, []);

  useEffect(() => {
    if (!urlReady) return;
    const handle = window.setTimeout(() => {
      const url = new URL(window.location.href);
      // preserve unrelated params the app does not own
      const incoming = new URLSearchParams(window.location.search);
      for (const key of ["at", "view", "metric", "province"])
        incoming.delete(key);
      for (const [key, value] of incoming) url.searchParams.set(key, value);
      const state = writeUrlState({ at: selection, view, metric });
      const params = new URLSearchParams(
        state ? state.slice(1) : incoming.toString(),
      );
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        query ? `${url.pathname}?${query}` : url.pathname,
      );
    }, 200);
    return () => window.clearTimeout(handle);
  }, [selection, view, metric, urlReady]);

  // Escape closes the province panel — the map is the thing, so give it back.
  useEffect(() => {
    if (selection.kind === "country" && !inspection && !notice) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("input,select,textarea")
      )
        return;
      if (focusMap) {
        setFocusMap(false);
        return;
      }
      if (notice || inspection) {
        setDetailState("collapsed");
        return;
      }
      // Step back out one level at a time.
      selectProvince(parentOf(selection).kind === "province" ? (parentOf(selection) as { province: ProvinceCode }).province : null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, notice, inspection, focusMap, selectProvince]);

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

  const provinceAdverts = useMemo(
    () => (province ? adverts.filter((l) => l.province === province) : []),
    [adverts, province],
  );

  const displayMetric = metric;
  const active = METRICS.find((m) => m.id === displayMetric)!;

  return (
    <div className="relative z-[1] terrain-experience">
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
          <a href="#map" className="nav-current">
            Explore land
          </a>
          <a href="/guide#applying">How to apply</a>
          <a href="/guide#money">Funding & support</a>
          <a href="/guide">Guide</a>
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
          <a
            className="btn-solid route-cta"
            href={`/guide${province ? `?province=${province}` : ""}#route`}
          >
            Find my route <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <main className="workspace">
        <section
          id="map"
          className={cx(
            "explorer-shell",
            view === "atlas" && "atlas-shell",
            view === "anatomy" && "anatomy-shell",
            (province || notice || inspection) &&
              detailState === "expanded" &&
              !focusMap &&
              "has-province-detail",
            focusMap && "map-focus-mode",
            compactMap && "map-compact-mode",
          )}
          aria-label="Explore South African provinces"
        >
          <div className="explorer-toolbar">
            <div>
              <p className="eyebrow">SOUTH AFRICA / LAND EXPLORER</p>
              <h1>
                Open the land. Explore its layers<span>.</span>
              </h1>
            </div>
            <div
              role="group"
              aria-label="Historical province measure"
              className="metric-switch"
              hidden={view === "anatomy"}
            >
              {METRICS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={displayMetric === m.id}
                  onClick={() => {
                    setMetric(m.id);
                  }}
                  className={cx(displayMetric === m.id && "is-active")}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div
            className="map-view-switch"
            role="group"
            aria-label="Map presentation"
          >
            <button
              aria-pressed={view === "anatomy"}
              onClick={() => {
                setView("anatomy");
                setNotice(null);
                setInspection(null);
                setCompactMap(false);
                setFocusMap(false);
              }}
            >
              {view === "atlas" ? "← Exploded overview" : "Exploded map"}
            </button>
            <button
              aria-pressed={view === "atlas"}
              onClick={() => setView("atlas")}
              aria-label="3D terrain"
            >
              3D terrain
            </button>
            <button
              aria-pressed={view === "data"}
              onClick={() => setView("data")}
              aria-label="Compare provincial land figures"
            >
              Compare area
            </button>
          </div>
          <div className="map-workspace-actions" hidden={view === "anatomy"}>
            <button
              aria-pressed={focusMap}
              onClick={() => setFocusMap((v) => !v)}
            >
              {focusMap ? "Show land browser" : "Focus map ⛶"}
            </button>
            <button
              aria-expanded={!compactMap}
              aria-controls="land-map-stage"
              onClick={() => setCompactMap((v) => !v)}
            >
              {compactMap ? "Expand map" : "Collapse map"}
            </button>
            <button
              disabled={!province && !notice && !inspection}
              aria-expanded={detailState === "expanded" && !focusMap}
              aria-controls="land-information-panel"
              onClick={() => {
                setFocusMap(false);
                setDetailState(
                  focusMap ? "expanded" : toggleDetailState(detailState),
                );
              }}
            >
              {detailState === "expanded" && !focusMap
                ? "Collapse details"
                : "Show details"}
            </button>
          </div>
          <div className="explorer-body">
            {
              <aside
                className="province-browser"
                aria-label="Province selector"
              >
                <NoticeBrowser province={province} onSelect={chooseNotice} />
                <details className="historical-browser">
                  <summary>Browse provinces & historical figures</summary>
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
                    <span>
                      {metric === "share" ? "STATE SHARE" : "HECTARES"}
                    </span>
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
                            chooseProvince(province === code ? null : code)
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
                              style={{
                                width: `${((value ?? 0) / max) * 100}%`,
                              }}
                            />
                          </span>
                        </button>
                      );
                    })}
                    {rankProvinces(metric, query).length === 0 && (
                      <div className="search-empty">
                        <p>No matching province or crop.</p>
                        <button
                          className="btn mt-3"
                          onClick={() => setQuery("")}
                        >
                          Clear search
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="province-browser-note">
                    <span className="status-dot" />
                    <p>
                      Regional views show the landscape. These are provincial
                      figures, not farm listings.
                    </p>
                  </div>
                </details>
              </aside>
            }
            <div className="map-stage" id="land-map-stage">
              {view === "anatomy" ? (
                <ExplodedMap
                  selected={province}
                  district={district}
                  onSelect={chooseProvince}
                  onSelectDistrict={setDistrict}
                  onNotice={chooseNotice}
                  onTerrain={() => {
                    setView("atlas");
                    setNotice(null);
                    setInspection(null);
                    setFocusMap(false);
                  }}
                />
              ) : view === "atlas" ? (
                <AtlasMap
                  onInspectInfrastructure={inspectInfrastructure}
                  notice={notice}
                  inspection={inspection}
                  onInspect={inspectPoint}
                  onSelectNotice={chooseNotice}
                  district={district}
                  onSelectDistrict={chooseDistrict}
                  metric={displayMetric}
                  selected={province}
                  onSelect={(code) => {
                    setMetric(displayMetric);
                    chooseProvince(code);
                  }}
                  onFallback={() => {
                    setView("data");
                  }}
                />
              ) : (
                <LandScene
                  metric={displayMetric}
                  selected={province}
                  onSelect={(code) => {
                    setMetric(displayMetric);
                    chooseProvince(code);
                  }}
                  district={district}
                  onSelectDistrict={chooseDistrict}
                  dark={dark}
                />
              )}
              {view !== "anatomy" && (notice || inspection || province) && (
                <button
                  className="map-selection-chip"
                  onClick={() => {
                    setFocusMap(false);
                    setDetailState(
                      focusMap ? "expanded" : toggleDetailState(detailState),
                    );
                  }}
                  aria-expanded={detailState === "expanded" && !focusMap}
                >
                  <span className="status-dot" />
                  <span>
                    {notice?.name ??
                      (inspection
                        ? `${inspection.coordinates[1].toFixed(3)}°, ${inspection.coordinates[0].toFixed(3)}°`
                        : province
                          ? PROVINCES[province].name
                          : "Selected land")}
                    <small>
                      {notice
                        ? parcelFor(notice.id)
                          ? `${notice.hectares.toFixed(1)} ha · ${notice.use} · cadastral parcel`
                          : `${notice.hectares.toFixed(1)} ha · district location only`
                        : inspection
                          ? "Selected point · inspect climate & capital"
                          : "Region selected · view information"}
                    </small>
                  </span>
                  <b>{detailState === "expanded" && !focusMap ? "⌄" : "↗"}</b>
                </button>
              )}
              <div className="map-legend" hidden={view !== "data"}>
                <div>
                  <span className="legend-ramp" />
                  <span>Lower</span>
                  <span>Higher</span>
                </div>
                <p>
                  {view === "atlas"
                    ? "Province shading shows "
                    : "Height & colour show "}
                  {active.label.toLowerCase()}.<br />
                  {view === "atlas"
                    ? "Provincial figures, not individual farm boundaries."
                    : "Statistical heights, not terrain elevation."}
                </p>
              </div>
            </div>
            {(province || notice || inspection) && (
              <div
                className="province-detail"
                id="land-information-panel"
                hidden={
                  detailState !== "expanded" ||
                  focusMap ||
                  view === "anatomy"
                }
              >
                {notice || inspection ? (
                  <LandDossier
                    key={notice?.id ?? "point"}
                    notice={notice}
                    point={inspection}
                    onClose={() => setDetailState("collapsed")}
                  />
                ) : province ? (
                  <>
                    {" "}
                    <button
                      className="collapse-region"
                      onClick={() => setDetailState("collapsed")}
                    >
                      Collapse region details ⌄
                    </button>
                    <ProvincePanel
                      code={province}
                      district={district}
                      onSelectDistrict={chooseDistrict}
                      adverts={provinceAdverts}
                      openIds={openIds}
                      onToggle={toggleOpen}
                      onClose={() => setDetailState("collapsed")}
                      onOpenOffices={() => {
                        window.location.assign("/guide#offices");
                      }}
                      hasFeed={hasFeed}
                    />
                  </>
                ) : null}
              </div>
            )}
          </div>
          <div className="explorer-footnote" hidden={view === "anatomy"}>
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
          <a
            href={`/guide${province ? `?province=${province}` : ""}#route`}
          >
            <span className="step-number">01</span>
            <div>
              <h3>Find your fit</h3>
              <p>Your farming plans, category and lease options.</p>
            </div>
            <span aria-hidden="true">↗</span>
          </a>
          <a href="/guide#applying">
            <span className="step-number">02</span>
            <div>
              <h3>Build your application</h3>
              <p>The process, Form ALA and a document checklist.</p>
            </div>
            <span aria-hidden="true">↗</span>
          </a>
          <a href="/guide#money">
            <span className="step-number">03</span>
            <div>
              <h3>Plan the funding</h3>
              <p>Understand grants, loans and farmer support.</p>
            </div>
            <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>

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
