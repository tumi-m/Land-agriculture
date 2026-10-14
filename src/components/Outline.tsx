import Link from "next/link";
import { FARM_NOTICES, NOTICE_CHECKED, type FarmNotice } from "@/content/farm-notices";
import { PROVINCES, PROVINCE_ORDER } from "@/content/provinces";
import STATS from "@/data/district-stats.json";
import { districtStats, landCover, phBand, readPh, readRain } from "@/lib/district-data";
import { noticeInDistrict } from "@/lib/exploded-map";
import { group, shortDate } from "@/lib/format";
import { DISTRICTS_BY_PROVINCE } from "@/lib/geo";

/**
 * The whole explorer as text: every province, every district, what the
 * model's slices measure there, and the lease notices in it. No WebGL, no
 * mouse, no script needed to read it; each row links into the 3D model for
 * anyone who can use that too.
 */

const ALL = Object.values(STATS.districts);
/** One district's record for each measure, to read its source and date from. */
const first = <K extends keyof (typeof ALL)[number]>(key: K) => ALL.find((d) => d[key])?.[key];
const AREA = first("areaKm2") as { source: string; date: string } | undefined;
const RAIN = first("rain") as { source: string; date: string; resolution: string } | undefined;
const PH = first("soilPh") as { source: string; date: string; resolution: string } | undefined;
const COVER = first("landCover") as { source: string; date: string; resolution: string } | undefined;

const NOT_RECORDED = "Not recorded";
const placed = (n: FarmNotice) => Object.values(DISTRICTS_BY_PROVINCE).some((ds) => ds.some((d) => noticeInDistrict(n, d)));

function Sources() {
  const rows: [string, string][] = [
    [
      "Districts and area",
      `Code for Germany click_that_hood, ${STATS.boundaries.date}, names updated to current official names${
        AREA ? "; area measured on those boundaries" : ""
      }`,
    ],
    ["Rainfall", RAIN ? `${RAIN.source}, ${RAIN.date}, ${RAIN.resolution}` : NOT_RECORDED],
    ["Soil pH", PH ? `${PH.source}, ${PH.date}, ${PH.resolution}` : NOT_RECORDED],
    ["Main land cover", COVER ? `${COVER.source}, ${COVER.date}, ${COVER.resolution}` : NOT_RECORDED],
    ["Lease notices", `DLRRD 2026 state farm lease adverts, reviewed ${shortDate(NOTICE_CHECKED)}`],
  ];
  return (
    <dl className="outline-sources">
      {rows.map(([what, where]) => (
        <div key={what}>
          <dt>{what}</dt>
          <dd>{where}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function Outline() {
  const awaiting = FARM_NOTICES.filter((n) => !placed(n));
  return (
    <div className="land-outline">
      <p className="outline-lede">
        Every province and district, what each measures, and the reviewed
        lease notices in it — the same facts as the 3D model, as tables you
        can read with a keyboard or a screen reader.
      </p>
      <p className="outline-limit">
        What this doesn&rsquo;t tell you: a district&rsquo;s mean hides the
        range inside it, and a notice&rsquo;s district is not where its farm
        is.
      </p>
      <h2 className="outline-h2">Where the figures come from</h2>
      <Sources />

      {PROVINCE_ORDER.map((code) => {
        const province = PROVINCES[code];
        const districts = DISTRICTS_BY_PROVINCE[code];
        return (
          <section key={code} aria-labelledby={`outline-${code}`} className="outline-province">
            <h2 id={`outline-${code}`} className="outline-h2">
              {province.name}{" "}
              <Link href={`/?at=province:${code}`} className="outline-open">
                Open in the 3D model
              </Link>
            </h2>
            <div className="overflow-x-auto">
              <table className="outline-table">
                <caption className="sr-only">
                  Districts of {province.name}: area, rainfall, soil pH, main land cover and reviewed lease notices.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">District</th>
                    <th scope="col" className="outline-num">Area · km²</th>
                    <th scope="col" className="outline-num">Rainfall · mm/year</th>
                    <th scope="col" className="outline-num">Soil pH</th>
                    <th scope="col">Main land cover</th>
                    <th scope="col">Lease notices</th>
                  </tr>
                </thead>
                <tbody>
                  {districts.map((d) => {
                    const stats = districtStats(d.id);
                    const rain = stats ? readRain(stats) : null;
                    const ph = stats ? readPh(stats) : null;
                    const area = stats?.areaKm2?.value ?? null;
                    const [main] = landCover(d.id);
                    const notices = FARM_NOTICES.filter((n) => noticeInDistrict(n, d));
                    return (
                      <tr key={d.id}>
                        <th scope="row">
                          <Link href={`/?at=district:${code}:${d.id}`}>{d.name}</Link>
                        </th>
                        <td className="outline-num">{area === null ? NOT_RECORDED : group(Math.round(area))}</td>
                        <td className="outline-num">{rain === null ? NOT_RECORDED : group(Math.round(rain))}</td>
                        <td className="outline-num">{ph === null ? NOT_RECORDED : `${ph.toFixed(1)} · ${phBand(ph)}`}</td>
                        <td>{main ? `${main.name} · ${Math.round(main.share * 100)}%` : NOT_RECORDED}</td>
                        <td>
                          {notices.length ? (
                            <ul className="outline-notices">
                              {notices.map((n) => (
                                <li key={n.id}>
                                  <Link href={`/?at=notice:${n.id}&view=land`}>{n.name}</Link>
                                  <small> · {n.use}</small>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            "None reviewed"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {awaiting.length > 0 && (
        <section aria-labelledby="outline-awaiting" className="outline-province">
          <h2 id="outline-awaiting" className="outline-h2">
            Notices awaiting their district
          </h2>
          <ul className="outline-notices">
            {awaiting.map((n) => (
              <li key={n.id}>
                <Link href={`/?at=notice:${n.id}&view=land`}>{n.name}</Link>
                <small> · {n.use} · {PROVINCES[n.province].name}</small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
