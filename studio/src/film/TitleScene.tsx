/**
 * Title: the brand, the promise, and the three counts the film is built on.
 * The layout is the Satori title card's; GSAP animates it. SplitText breaks
 * the headline into characters, and the counts tick up from zero.
 */
import { useRef } from "react";
import { Backdrop, Mark, SAFE, source } from "./Brand";
import { COUNTS, SOURCES } from "./data";
import { PALETTE } from "./theme";
import { FONTS } from "../lib/fonts";
import { SplitText, useTimeline } from "../lib/gsap";

const STATS = [
  { value: COUNTS.provinces, label: "provinces" },
  { value: COUNTS.districts, label: "districts" },
  { value: COUNTS.notices, label: "lease notices reviewed" },
];

export function TitleScene() {
  const scope = useRef<HTMLDivElement>(null);

  useTimeline(scope, (tl) => {
    const headline = SplitText.create(".headline", { type: "chars,words" });
    tl.from(".mark-tile", { scale: 0.4, rotate: -12, opacity: 0, duration: 0.6, ease: "back.out(2)" }, 0)
      .from(".mark-words", { x: -30, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.15)
      .from(headline.chars, { yPercent: 80, opacity: 0, duration: 0.7, ease: "power4.out", stagger: 0.028 }, 0.35)
      .from(".subtitle", { y: 24, opacity: 0, duration: 0.7, ease: "power3.out" }, 1.15)
      .from(".stat", { y: 24, opacity: 0, duration: 0.5, ease: "power3.out", stagger: 0.12 }, 1.6)
      .from(".source", { opacity: 0, duration: 0.6 }, 2.2);
    // Each count runs up from zero to the value the app shows.
    for (const el of scope.current!.querySelectorAll<HTMLElement>(".count")) {
      const value = Number(el.dataset.value);
      const counter = { n: 0 };
      tl.to(
        counter,
        {
          n: value,
          duration: 0.9,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = String(Math.round(counter.n));
          },
        },
        1.6,
      );
    }
  });

  return (
    <Backdrop>
      <div ref={scope} style={SAFE}>
        <Mark />
        <div style={{ flexGrow: 1 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            className="headline"
            style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 150, letterSpacing: -6, lineHeight: 1 }}
          >
            Open the land.
          </div>
          <div className="subtitle" style={{ fontSize: 40, color: PALETTE.muted, maxWidth: 1300 }}>
            Where South Africa’s state farmland is, what it is like, and how to apply for it.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 72 }}>
          <div
            style={{
              display: "flex",
              gap: 56,
              fontFamily: FONTS.display,
              fontWeight: 600,
              fontSize: 40,
              color: PALETTE.accent,
            }}
          >
            {STATS.map((s) => (
              <div key={s.label} className="stat">
                {/* Starts at the true value, so a frame GSAP has not reached
                    still says something correct. */}
                <span className="count" data-value={s.value} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {s.value}
                </span>{" "}
                {s.label}
              </div>
            ))}
          </div>
          <div className="source" style={source}>
            {SOURCES.notices}
          </div>
        </div>
      </div>
    </Backdrop>
  );
}
