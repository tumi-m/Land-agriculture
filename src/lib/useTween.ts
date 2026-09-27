"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Whether the reader has asked for less motion. Read once per mount; the
 * setting is an OS preference that does not change mid-visit in practice.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Ease-out cubic: fast off the mark, settling gently onto the value. */
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * A number that travels from where it was to `target`.
 *
 * The motion exists to show that a figure changed and in which direction —
 * moving from one district to the next, the rainfall visibly climbs or falls.
 * With reduced motion, or before mount, it is simply the target.
 *
 * Callers render the tweened value `aria-hidden` and put `target` in the
 * accessible text, so a screen reader hears the answer once rather than
 * every number the animation passes through.
 */
export function useTween(
  target: number | null,
  duration = 700,
  delay = 0,
): number | null {
  const [value, setValue] = useState<number | null>(target);
  // Where the number is on screen right now. Null on first mount, so a
  // figure's first appearance counts up from zero; after that each change
  // starts from wherever the last one had reached, so a quick change of
  // district bends the number rather than resetting it.
  const shown = useRef<number | null>(null);

  // A layout effect so the starting value is committed before the browser
  // paints: otherwise the final figure flashes for a frame before the count.
  useLayoutEffect(() => {
    if (target === null) {
      setValue(null);
      shown.current = null;
      return;
    }
    const start = shown.current ?? 0;
    if (prefersReducedMotion() || start === target) {
      setValue(target);
      shown.current = target;
      return;
    }
    setValue(start);
    let frame = 0;
    let began = 0;
    const tick = (now: number) => {
      if (!began) began = now + delay;
      const t = Math.min(1, Math.max(0, (now - began) / duration));
      const v = start + (target - start) * easeOut(t);
      shown.current = v;
      setValue(v);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, delay]);

  return value;
}
