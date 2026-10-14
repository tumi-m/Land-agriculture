import { SourceNote } from "@/components/ui/SourceNote";
import { CONTENT_REVIEWED } from "@/content/meta";
import { NOTICE_CHECKED } from "@/content/farm-notices";
import { STAGES, TOTAL_DAYS } from "@/content/process";
import STATS from "@/data/district-stats.json";
import { noticePlacement } from "@/lib/exploded-map";
import { plural, shortDate } from "@/lib/format";
import { DISTRICTS, PROVINCE_SHAPES } from "@/lib/geo";

/**
 * The studio's launch film (studio/, `npm run ship`), with everything it says
 * written out beside it. The film is a recording of the figures on the day it
 * was made; the text is counted from the same data on every build, so if the
 * data moves on, the text says so first.
 */
const FILM_MADE = "2026-10-14";

export default function FilmTour() {
  const placement = noticePlacement();
  return (
    <section aria-labelledby="film-tour-title" className="film-tour">
      <video
        className="film-tour-video"
        controls
        preload="none"
        playsInline
        poster="/media/launch-poster.jpg"
        width={1920}
        height={1080}
        aria-describedby="film-tour-summary"
      >
        <source src="/media/launch.webm" type="video/webm" />
        <source src="/media/launch-720p.mp4" type="video/mp4" />
      </video>
      <div className="film-tour-text">
        <p className="eyebrow">A 25-second tour</p>
        <h2 id="film-tour-title" className="font-display text-ink">
          The land, the notices, and the wait
        </h2>
        <ol id="film-tour-summary" className="film-tour-beats">
          <li>
            <b>
              {PROVINCE_SHAPES.length} provinces and {DISTRICTS.length} districts
            </b>{" "}
            fall into place in 3D.
            <SourceNote
              source="District boundaries: Code for Germany click_that_hood, names updated to current official names"
              date={STATS.boundaries.date}
            />
          </li>
          <li>
            <b>
              {placement.placed} of {placement.notices} reviewed lease notices
            </b>{" "}
            are pinned to {placement.districts} districts.{" "}
            {placement.spanning > 0 &&
              `${placement.spanning} ${plural(placement.spanning, "notice spans", "notices span")} two districts. `}
            {placement.awaiting > 0 &&
              `${placement.awaiting} ${plural(placement.awaiting, "awaits its district", "await their districts")}. `}
            Pins mark districts, not farms.
            <SourceNote source="DLRRD 2026 state farm lease adverts" date={`reviewed ${shortDate(NOTICE_CHECKED)}`} />
          </li>
          <li>
            <b>About {TOTAL_DAYS} days</b> from the closing day to a signed
            lease, through {STAGES.length} stages.
            <SourceNote
              source="Approximate stage durations from state land lease policy"
              date={`reviewed ${shortDate(CONTENT_REVIEWED)}`}
            />
          </li>
        </ol>
        <p className="film-tour-note">
          Made {shortDate(FILM_MADE)} from these figures. Music only, no
          speech: everything the film says is on screen and written here.
        </p>
      </div>
    </section>
  );
}
