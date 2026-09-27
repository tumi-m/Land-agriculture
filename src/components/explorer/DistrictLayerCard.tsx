"use client";
import type { CSSProperties } from "react";
import { RASTER_RAMPS } from "@/design/ramps";
import {
  along,
  comparedWith,
  districtStats,
  landCover,
  phBand,
  rampGradient,
  rankBy,
  readClay,
  readPh,
  readRain,
  spread,
  type Sourced,
} from "@/lib/district-data";
import { group } from "@/lib/format";
import { useTween } from "@/lib/useTween";

type CardLayer = "land" | "soil" | "climate";

/** The pH scale drawn under the figure. Every district falls inside it. */
const PH_SCALE: [number, number] = [4, 9];
/** Clay in g/kg; 600 g/kg (60%) is past any district mean. */
const CLAY_SCALE: [number, number] = [0, 600];

const pct = (share: number) =>
  share < 0.01 ? "<1%" : `${Math.round(share * 100)}%`;

/**
 * What one slice of the model measures in one district: the numbers baked
 * from the rasters, each with the source, date and resolution it came from,
 * and one line on what the numbers cannot tell you.
 *
 * Figures count to their value and scales sweep into place, so moving from
 * one district to the next shows which way each measure moved. The moving
 * copies are aria-hidden; screen readers get the final value once.
 */
export default function DistrictLayerCard({
  district,
  layer,
}: {
  district: string;
  layer: CardLayer;
}) {
  const stats = districtStats(district);
  if (!stats) {
    return (
      <p className="dcard-limit">
        No baked statistics for this district yet.
      </p>
    );
  }
  return (
    <section className="dcard" aria-label={`${stats.name} measurements`}>
      {layer === "land" && <LandCard district={district} />}
      {layer === "soil" && <SoilCard district={district} />}
      {layer === "climate" && <ClimateCard district={district} />}
    </section>
  );
}

function LandCard({ district }: { district: string }) {
  const stats = districtStats(district)!;
  const cover = landCover(district);
  const top = cover[0];
  const elevation = stats.elevation;
  return (
    <>
      {top && (
        <p className="dcard-lede">
          Mostly <strong>{top.name.toLowerCase()}</strong> —{" "}
          {pct(top.share)} of the district.
        </p>
      )}
      {cover.length > 0 && (
        <>
          <div
            className="dcard-stack"
            role="img"
            aria-label={cover
              .map((c) => `${c.name} ${pct(c.share)}`)
              .join(", ")}
          >
            {cover.map((c) => (
              <span
                key={c.code}
                style={{ flexGrow: c.share, background: c.colour }}
              />
            ))}
          </div>
          <ul className="dcard-legend">
            {cover.map((c, i) => (
              <li key={c.code} style={{ "--i": i } as CSSProperties}>
                <i style={{ background: c.colour }} />
                <span>{c.name}</span>
                <b>{pct(c.share)}</b>
              </li>
            ))}
          </ul>
          <Source of={stats.landCover} />
        </>
      )}
      <div className="dcard-figures">
        <Figure label="Area" value={stats.areaKm2.value} unit="km²" />
        {elevation && (
          <Figure
            label="Average height"
            value={elevation.mean}
            unit="m"
            note={`${group(elevation.min)}–${group(elevation.max)} m`}
          />
        )}
      </div>
      {elevation && <Source of={elevation} />}
      <p className="dcard-limit">
        A 2021 satellite classification of what covers the ground. It says
        nothing about who owns the land, whether it can be leased, or the
        condition of what grows there.
      </p>
    </>
  );
}

function SoilCard({ district }: { district: string }) {
  const stats = districtStats(district)!;
  const ph = readPh(stats);
  const clay = stats.soilClay;
  const shownPh = useTween(ph, 900, 120);
  const shownClay = useTween(clay ? clay.meanGPerKg : null, 900, 260);
  const alkaline = comparedWith(rankBy(district, readPh), "More alkaline");
  const clayer = comparedWith(rankBy(district, readClay), "More clay");
  return (
    <>
      {ph !== null && (
        <>
          <Figure
            label="Soil pH, district average"
            value={ph}
            digits={1}
            note={phBand(ph)}
          />
          <div className="dcard-scale">
            <div
              className="dcard-bar"
              style={{
                background: rampGradient(RASTER_RAMPS.soilPh, ...PH_SCALE),
              }}
            >
              <span
                className="dcard-needle"
                aria-hidden
                style={
                  {
                    "--at": along(shownPh ?? ph, ...PH_SCALE),
                  } as CSSProperties
                }
              />
            </div>
            <Ticks
              values={[4, 5, 6, 7, 8, 9]}
              scale={PH_SCALE}
              labels={["4 acidic", "", "", "7", "", "alkaline 9"]}
            />
          </div>
          {alkaline && <p className="dcard-compare">{alkaline}.</p>}
          <Source of={stats.soilPh} />
        </>
      )}
      {clay && (
        <>
          <Figure
            label="Clay in the soil"
            value={clay.meanPercent}
            unit="%"
            note="by weight"
          />
          <div className="dcard-scale">
            <div className="dcard-bar is-track">
              <span
                className="dcard-fill"
                aria-hidden
                style={
                  {
                    "--at": along(shownClay ?? clay.meanGPerKg, ...CLAY_SCALE),
                    background: rampGradient(
                      RASTER_RAMPS.soilClay,
                      ...CLAY_SCALE,
                    ),
                  } as CSSProperties
                }
              />
            </div>
            <Ticks
              values={[0, 300, 600]}
              scale={CLAY_SCALE}
              labels={["0%", "30%", "60%"]}
            />
          </div>
          {clayer && <p className="dcard-compare">{clayer}.</p>}
          <Source of={clay} />
        </>
      )}
      <p className="dcard-limit">
        A modelled 250 m average across the whole district. A field can differ
        a great deal from it — test the soil on the parcel before planning a
        crop.
      </p>
    </>
  );
}

function ClimateCard({ district }: { district: string }) {
  const stats = districtStats(district)!;
  const rain = stats.rain;
  const range = spread(readRain);
  const shownMean = useTween(rain?.mean ?? null, 900, 120);
  if (!rain || !range) {
    return <p className="dcard-limit">No rainfall recorded for this district.</p>;
  }
  // A national scale, so the band sits in the same place for the same
  // rainfall whichever district is open.
  const top = Math.ceil(range[1] / 100) * 100;
  const scale: [number, number] = [0, top];
  const lo = along(rain.p10, ...scale);
  const hi = along(rain.p90, ...scale);
  const mean = along(rain.mean, ...scale);
  const wetter = comparedWith(rankBy(district, readRain), "Wetter");
  return (
    <>
      <Figure
        label="Rainfall, yearly average"
        value={rain.mean}
        unit="mm a year"
      />
      <div className="dcard-scale">
        <div
          className="dcard-bar"
          style={{ background: rampGradient(RASTER_RAMPS.rain, ...scale) }}
        >
          <span
            key={district}
            className="dcard-band"
            aria-hidden
            style={
              {
                left: `${lo * 100}%`,
                width: `${Math.max(hi - lo, 0.004) * 100}%`,
                "--origin": `${hi > lo ? ((mean - lo) / (hi - lo)) * 100 : 50}%`,
              } as CSSProperties
            }
          />
          <span
            className="dcard-needle"
            aria-hidden
            style={
              {
                "--at": along(shownMean ?? rain.mean, ...scale),
              } as CSSProperties
            }
          />
        </div>
        <Ticks
          values={[0, top / 2, top]}
          scale={scale}
          labels={["0", group(top / 2), `${group(top)} mm`]}
        />
      </div>
      <p className="dcard-caption">
        The middle 80% of the district’s land averages between{" "}
        <b>{group(rain.p10)}</b> and <b>{group(rain.p90)}</b> mm a year.
      </p>
      {wetter && <p className="dcard-compare">{wetter}.</p>}
      <Source of={rain} />
      <p className="dcard-limit">
        A 1991–2020 average. It hides dry years and when in the year the rain
        falls, and it is not a right to take water — that needs a licence
        under the National Water Act.
      </p>
    </>
  );
}

function Figure({
  label,
  value,
  unit,
  digits = 0,
  note,
}: {
  label: string;
  value: number;
  unit?: string;
  digits?: number;
  note?: string;
}) {
  const shown = useTween(value);
  // Fixed places, not trimmed ones: a pH of 6.02 reads "6.0", because "6"
  // would claim a precision the other districts' "6.4" does not share.
  const format = (n: number) =>
    digits ? n.toFixed(digits) : group(Math.round(n));
  const final = format(value);
  // Pad with a figure space so the width holds still while it counts.
  const moving = format(shown ?? value).padStart(final.length, " ");
  return (
    <div className="dcard-figure" data-value={value}>
      <span className="dcard-label">{label}</span>
      <strong>
        <span aria-hidden>{moving}</span>
        <span className="dcard-sr">{final}</span>
        {unit && <small> {unit}</small>}
      </strong>
      {note && <span className="dcard-note">{note}</span>}
    </div>
  );
}

function Ticks({
  values,
  scale,
  labels,
}: {
  values: number[];
  scale: [number, number];
  labels: string[];
}) {
  return (
    <div className="dcard-ticks" aria-hidden>
      {values.map((v, i) =>
        labels[i] ? (
          <span
            key={v}
            style={{ "--at": along(v, ...scale) } as CSSProperties}
          >
            {labels[i]}
          </span>
        ) : null,
      )}
    </div>
  );
}

function Source({ of }: { of: Sourced }) {
  return (
    <p className="dcard-source">
      {[of.source, of.date, of.resolution, of.licence]
        .filter(Boolean)
        .join(" · ")}
    </p>
  );
}
