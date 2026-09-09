"use client";
import { useEffect, useState } from "react";
import type { MapInspection } from "@/lib/map-selection";
import type { Climate } from "@/lib/climate";
import {
  FARM_NOTICES,
  NOTICE_CHECKED,
  NOTICE_INDEX,
  noticeUrl,
  noticeStatus,
  type FarmNotice,
} from "@/content/farm-notices";
import type { ProvinceCode } from "@/lib/types";
import { parcelFor, CADASTRE_SOURCE } from "@/lib/cadastre";
import FarmBudget from "./FarmBudget";
import GovernmentNotices from "./GovernmentNotices";
function ClimateProfile({ point }: { point: MapInspection }) {
  const [data, setData] = useState<Climate | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    fetch(
      `/api/climate?lon=${point.coordinates[0]}&lat=${point.coordinates[1]}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [point.coordinates[0], point.coordinates[1], attempt]);
  return (
    <section>
      <p className="eyebrow">CLIMATE AT SELECTED POINT</p>
      <h3>Rain & growing conditions</h3>
      <p className="dossier-note">
        {point.coordinates[1].toFixed(4)}°, {point.coordinates[0].toFixed(4)}° ·{" "}
        {point.elevation === null
          ? "Elevation unavailable"
          : `terrain ≈ ${Math.round(point.elevation)} m`}
      </p>
      {error ? (
        <p role="status">
          {error}{" "}
          <button className="btn" onClick={() => setAttempt((x) => x + 1)}>
            Retry
          </button>
        </p>
      ) : !data ? (
        <p role="status">Loading historical climate…</p>
      ) : (
        <>
          <div className="dossier-stats">
            <div>
              <small>Annual rainfall estimate</small>
              <strong>
                {data.annualRain === null
                  ? "Unavailable"
                  : `${data.annualRain} mm`}
              </strong>
            </div>
            <div>
              <small>Mean temperature</small>
              <strong>
                {data.meanTemperature === null
                  ? "Unavailable"
                  : `${data.meanTemperature.toFixed(1)} °C`}
              </strong>
            </div>
          </div>
          <div className="rain-chart" aria-label="Monthly rainfall estimate">
            {data.months.map((m) => (
              <div
                key={m.name}
                title={`${m.name}: ${m.rain ?? "unknown"} mm; ${m.temperature ?? "unknown"} °C`}
              >
                <span>{m.rain ?? "—"}</span>
                <i
                  style={{
                    height: `${m.rain === null ? 0 : Math.max(2, (m.rain / Math.max(...data.months.map((m) => m.rain ?? 0), 1)) * 76)}px`,
                  }}
                />
                <small>{m.name.slice(0, 1)}</small>
              </div>
            ))}
          </div>
          <details>
            <summary>Monthly rainfall & temperature</summary>
            {data.months.map((m) => (
              <div className="cash-row" key={m.name}>
                <span>{m.name}</span>
                <span>
                  {m.rain ?? "—"} mm · {m.temperature ?? "—"} °C
                </span>
              </div>
            ))}
          </details>
          <p className="dossier-note">
            {data.period}. Regional gridded estimates, not a farm weather
            station or forecast. Monthly rainfall converts mean mm/day using
            month lengths. These averages do not establish flood, drought or
            frost risk.
          </p>
          <a
            className="dossier-source"
            href={data.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            NASA POWER source data ↗
          </a>
        </>
      )}
    </section>
  );
}
export function NoticeBrowser({
  province,
  onSelect,
}: {
  province: ProvinceCode | null;
  onSelect: (n: FarmNotice) => void;
}) {
  const [all, setAll] = useState(false);
  const notices = FARM_NOTICES.filter(
    (n) => all || !province || n.province === province,
  );
  return (
    <section className="notice-browser">
      <p className="eyebrow">GOVERNMENT FARM NOTICES</p>
      <div className="notice-filter">
        <strong>{notices.length} sourced notices</strong>
        <button aria-pressed={all} onClick={() => setAll(!all)}>
          {all ? "Selected province" : "All provinces"}
        </button>
      </div>
      <GovernmentNotices
        key={`${province}-${all}`}
        notices={notices}
        onSelect={onSelect}
      />
    </section>
  );
}
export default function LandDossier({
  notice,
  point,
  onClose,
}: {
  notice: FarmNotice | null;
  point: MapInspection | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "climate" | "budget">(
    notice ? "overview" : point ? "climate" : "overview",
  );
  return (
    <aside className="land-dossier">
      <div className="dossier-heading">
        <div>
          <p className="eyebrow">LAND INTELLIGENCE</p>
          <h2>{notice?.name ?? "Explore this location"}</h2>
        </div>
        <button
          className="btn"
          aria-label="Collapse land information"
          onClick={onClose}
        >
          Close ×
        </button>
      </div>
      <div className="dossier-tabs" role="group" aria-label="Land information">
        {(["overview", "climate", "budget"] as const).map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t === "overview"
              ? "Land & access"
              : t === "climate"
                ? "Climate & soil"
                : "Capital & income"}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <>
          {notice ? (
            <>
              <span className="notice-badge">
                {noticeStatus(notice) === "Closed"
                  ? "Past advert · deadline passed"
                  : "Deadline ahead"}
              </span>
              {noticeStatus(notice) === "Closed" && (
                <p className="dossier-callout">
                  This application deadline has passed. Current allocation or
                  re-advertising status is not confirmed. Contact the officer
                  below before preparing an application.
                </p>
              )}
              <div className="dossier-stats">
                <div>
                  <small>Advertised extent</small>
                  <strong>{notice.hectares.toLocaleString("en-ZA")} ha</strong>
                </div>
                <div>
                  <small>Advertised enterprise</small>
                  <strong>{notice.use}</strong>
                </div>
              </div>
              <p>
                {notice.municipality} · {notice.district}
              </p>
              <p className="dossier-callout">
                {parcelFor(notice.id)
                  ? "Cadastral parcel matched by farm name, number, portion, registration division and province. Source geometry is a reference boundary; confirm the current survey and lease extent with DLRRD."
                  : "District location only. Farm coordinates and lease-unit boundaries are awaiting a cadastral match. Map clicks analyse the clicked point, not this unlocated farm."}
              </p>
              {parcelFor(notice.id) && (
                <>
                  <a
                    className="dossier-source"
                    href={CADASTRE_SOURCE}
                    target="_blank"
                    rel="noreferrer"
                  >
                    CSG cadastral data via DFFE ↗
                  </a>
                  <p className="dossier-note">
                    GIS extent{" "}
                    {parcelFor(notice.id)!.properties.gisHectares.toFixed(4)}{" "}
                    ha; notice extent {notice.hectares} ha. Small differences
                    exist between mapped and legal areas. This layer does not
                    establish current ownership.
                  </p>
                </>
              )}
              <h3>What the notice states</h3>
              <ul>
                {notice.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="dossier-note">{notice.reference}</p>
              <details open>
                <summary>Application & access</summary>
                <p>
                  Deadline:{" "}
                  {new Date(notice.closes).toLocaleString("en-ZA", {
                    timeZone: "Africa/Johannesburg",
                  })}{" "}
                  SAST.
                </p>
                <p>Priority / experience: {notice.priority}.</p>
                <p>
                  The offer is a state lease. Read the notice for eligibility,
                  documents and physical submission offices.
                </p>
                <a
                  className="dossier-source"
                  href={noticeUrl(notice)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read official farm notice ↗
                </a>
                <a className="dossier-source" href={`tel:${notice.phone}`}>
                  Call {notice.contact} · {notice.phone}
                </a>
              </details>
            </>
          ) : (
            <p>
              Select a government notice or click the terrain to inspect a
              location.
            </p>
          )}
          <h3>Before choosing an enterprise</h3>
          <ul>
            <li>
              Verify the lease boundary, permitted use and productive hectares.
            </li>
            <li>
              Confirm borehole yield, water licence, electricity and access
              roads.
            </li>
            <li>
              Inspect buildings, fencing, irrigation and rehabilitation costs.
            </li>
            <li>
              Check transport costs, buyers, labour and animal-health
              restrictions.
            </li>
          </ul>
        </>
      )}
      {tab === "climate" && (
        <>
          {point ? (
            <ClimateProfile point={point} />
          ) : (
            <p className="dossier-callout">
              Click a location on the terrain to load climate estimates. A
              farm-specific profile needs a verified farm location.
            </p>
          )}
          <section>
            <p className="eyebrow">SOIL & WATER</p>
            <h3>Soil evidence still needed</h3>
            <p>
              Verified soil results are not available for these notices. The
              SoilGrids service did not return data during this update.
            </p>
            <ul>
              <li>
                Test pH, texture, organic carbon, phosphorus, potassium and
                salinity.
              </li>
              <li>
                Check effective rooting depth, drainage, slope and erosion on
                each field.
              </li>
              <li>Confirm usable irrigation water and seasonal reliability.</li>
            </ul>
            <p className="dossier-note">
              No crop suitability score is assigned without this evidence.
            </p>
            <a
              className="dossier-source"
              href="https://www.isric.org/explore/soilgrids"
              target="_blank"
              rel="noreferrer"
            >
              About SoilGrids estimates ↗
            </a>
          </section>
        </>
      )}
      <div hidden={tab !== "budget"}>
        <FarmBudget scope={notice?.name ?? "Selected location"} />
      </div>
    </aside>
  );
}
