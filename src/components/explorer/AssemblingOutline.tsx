"use client";

import { useEffect, useRef } from "react";
import { MAP_HEIGHT, MAP_WIDTH, PROVINCE_SHAPES, cachedPath } from "@/lib/geo";

/**
 * The country's provinces, traced over and over while the model is built.
 * Anime.js draws the strokes on; it is fetched only when the outline shows,
 * and not at all when the reader asks for less motion, who sees the
 * outline still.
 */
export default function AssemblingOutline() {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let stop: (() => void) | null = null;
    let gone = false;
    Promise.all([import("animejs/animation"), import("animejs/svg"), import("animejs/utils")]).then(
      ([{ animate }, { createDrawable }, { stagger }]) => {
        if (gone || !svg.current) return;
        const strokes = createDrawable(svg.current.querySelectorAll("path"));
        const tracing = animate(strokes, {
          draw: ["0 0", "0 1", "1 1"],
          duration: 2400,
          delay: stagger(110),
          ease: "inOutQuad",
          loop: true,
        });
        stop = () => tracing.revert();
      },
    );
    return () => {
      gone = true;
      stop?.();
    };
  }, []);

  return (
    <svg
      ref={svg}
      className="assembling-outline"
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      aria-hidden="true"
    >
      {PROVINCE_SHAPES.map((p) => (
        <path key={p.code} d={cachedPath(`province:${p.code}`, p.geometry)} />
      ))}
    </svg>
  );
}
