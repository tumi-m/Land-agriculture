"use client";

import { useEffect, useState } from "react";
import { LAND_JOURNEY } from "@/content/journey";
import { CONTENT_REVIEWED, SOURCE_NOTE } from "@/content/meta";

export function JourneyHeading({ chapter }: { chapter: number }) {
  const step = LAND_JOURNEY[chapter];
  return (
    <div className="journey-heading" key={step.id} aria-live="polite">
      <p className="eyebrow">
        {String(chapter + 1).padStart(2, "0")} / 05 <span>—</span> LAND · WATER
        · POSSIBILITY
      </p>
      <p className="journey-heading-period">{step.period}</p>
      <h2>{step.title}</h2>
    </div>
  );
}

export function JourneyNarration({
  chapter,
  onExplore,
  onRoute,
}: {
  chapter: number;
  onExplore: () => void;
  onRoute: () => void;
}) {
  const step = LAND_JOURNEY[chapter];
  return (
    <aside className="journey-narration" aria-label="Land journey narration">
      <div
        key={step.id}
        className="journey-copy animate-rise"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="journey-body">{step.narration}</p>
        <div className="journey-figure">
          <strong>{step.figure}</strong>
          <span>{step.figureLabel}</span>
        </div>
        <p className="journey-reading">{step.reading}</p>
      </div>
      <details className="journey-sources">
        <summary>About these figures</summary>
        <p>
          {SOURCE_NOTE} Reference reviewed {CONTENT_REVIEWED}. The guide
          combines different reporting periods and does not show current
          availability.
        </p>
      </details>
      <button
        className="btn-solid journey-action"
        onClick={chapter === LAND_JOURNEY.length - 1 ? onRoute : onExplore}
      >
        {chapter === LAND_JOURNEY.length - 1
          ? "Build my route"
          : step.province
            ? "Explore this province"
            : "Explore the data"}{" "}
        <span aria-hidden="true">↗</span>
      </button>
    </aside>
  );
}

export function JourneyTimeline({
  chapter,
  onChange,
}: {
  chapter: number;
  onChange: (chapter: number) => void;
}) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (chapter === LAND_JOURNEY.length - 1) setPlaying(false);
      else onChange(chapter + 1);
    }, 12000);
    return () => clearTimeout(timer);
  }, [playing, chapter, onChange]);
  return (
    <nav className="journey-timeline" aria-label="Land journey chapters">
      <ol>
        {LAND_JOURNEY.map((step, index) => (
          <li key={step.id}>
            <button
              type="button"
              aria-current={index === chapter ? "step" : undefined}
              onClick={() => {
                setPlaying(false);
                onChange(index);
              }}
            >
              <span className="journey-stop" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{step.label}</span>
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="journey-play"
        aria-pressed={playing}
        onClick={() => {
          if (!playing && chapter === LAND_JOURNEY.length - 1) onChange(0);
          setPlaying(!playing);
        }}
      >
        {playing ? "Ⅱ Pause journey" : "▷ Play journey"}
      </button>
      <p className="journey-current">
        {String(chapter + 1).padStart(2, "0")} / 05{" "}
        <em>{LAND_JOURNEY[chapter].label}</em>
      </p>
      <div className="journey-navigation">
        <button
          type="button"
          className="btn"
          disabled={chapter === 0}
          onClick={() => {
            setPlaying(false);
            onChange(chapter - 1);
          }}
          aria-label="Previous land journey chapter"
        >
          ← Back
        </button>
        <button
          type="button"
          className="btn-solid"
          onClick={() => {
            setPlaying(false);
            onChange(chapter === LAND_JOURNEY.length - 1 ? 0 : chapter + 1);
          }}
        >
          {chapter === LAND_JOURNEY.length - 1 ? "Start again" : "Continue"}{" "}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </nav>
  );
}
