"use client";

import { useRef, type PointerEvent } from "react";
import { animate } from "motion";

/** How far a sheet has to be pulled down before letting go closes it. */
export const SWIPE_CLOSE_PX = 90;

/**
 * The fastest release the spring starts from, in px/s. Pointer events can
 * arrive a millisecond apart, and a speed measured across one of those gaps
 * would fling the sheet far past where the finger left it.
 */
const MAX_SPEED = 2500;

type Glide = ReturnType<typeof animate>;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Moves the sheet from `from` to `to` px below its resting place on a spring
 * that starts at the finger's release speed, so a sheet let go mid-flick keeps
 * travelling the way it was thrown rather than restarting from rest.
 */
function glide(sheet: HTMLElement, from: number, to: number, velocity: number, done?: () => void): Glide | null {
  sheet.style.transition = "none";
  let finished = false;
  const finish = () => {
    finished = true;
    if (done) return done();
    sheet.style.transform = "";
    sheet.style.transition = "";
  };
  if (reducedMotion() || from === to) {
    finish();
    return null;
  }
  return animate(from, to, {
    type: "spring",
    velocity,
    // Closing never bounces; settling back may, a little.
    bounce: done ? 0 : 0.2,
    visualDuration: done ? 0.22 : 0.32,
    onUpdate: (y) => {
      // An update can land after completion; the sheet is at rest by then.
      if (!finished) sheet.style.transform = `translateY(${y}px)`;
    },
    onComplete: finish,
  });
}

/**
 * Pull-down-to-close for a bottom sheet, attached to the sheet's header.
 *
 * Only on the compact layout, where the panel is a sheet above the dock;
 * on a wide screen it is a side panel and has nothing to pull. The sheet
 * follows the finger while dragging; let go past the threshold and it
 * slides away before closing, let go early and it springs back. Presses
 * that start on a button inside the header are left to the button.
 */
export function useSwipeDown(onClose: () => void) {
  const drag = useRef<{ start: number; dy: number; at: number; velocity: number } | null>(null);
  const motion = useRef<Glide | null>(null);
  const sheetOf = (el: HTMLElement) => el.parentElement;
  const release = (el: HTMLElement, close: boolean) => {
    const d = drag.current;
    drag.current = null;
    const sheet = sheetOf(el);
    if (!d || !sheet) return;
    motion.current = close
      ? glide(sheet, d.dy, sheet.offsetHeight, d.velocity, onClose)
      : glide(sheet, d.dy, 0, d.velocity);
  };
  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!window.matchMedia("(max-width: 1100px)").matches) return;
      if ((event.target as HTMLElement).closest("button")) return;
      motion.current?.stop();
      drag.current = { start: event.clientY, dy: 0, at: event.timeStamp, velocity: 0 };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const d = drag.current;
      if (!d) return;
      const sheet = sheetOf(event.currentTarget);
      if (!sheet) return;
      const dy = Math.max(0, event.clientY - d.start);
      const dt = event.timeStamp - d.at;
      if (dt > 0) d.velocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, ((dy - d.dy) / dt) * 1000));
      d.dy = dy;
      d.at = event.timeStamp;
      sheet.style.transition = "none";
      sheet.style.transform = `translateY(${dy}px)`;
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const d = drag.current;
      if (!d) return;
      release(event.currentTarget, event.clientY - d.start > SWIPE_CLOSE_PX);
    },
    onPointerCancel(event: PointerEvent<HTMLElement>) {
      release(event.currentTarget, false);
    },
  };
}
