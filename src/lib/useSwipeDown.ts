"use client";

import { useRef, type PointerEvent } from "react";

/** How far a sheet has to be pulled down before letting go closes it. */
export const SWIPE_CLOSE_PX = 90;

/**
 * Pull-down-to-close for a bottom sheet, attached to the sheet's header.
 *
 * Only on the compact layout, where the panel is a sheet above the dock;
 * on a wide screen it is a side panel and has nothing to pull. The sheet
 * follows the finger while dragging and springs back if released early.
 * Presses that start on a button inside the header are left to the button.
 */
export function useSwipeDown(onClose: () => void) {
  const start = useRef<number | null>(null);
  const sheetOf = (el: HTMLElement) => el.parentElement;
  const settle = (el: HTMLElement) => {
    const sheet = sheetOf(el);
    if (!sheet) return;
    sheet.style.transition = "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)";
    sheet.style.transform = "";
  };
  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!window.matchMedia("(max-width: 1100px)").matches) return;
      if ((event.target as HTMLElement).closest("button")) return;
      start.current = event.clientY;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (start.current === null) return;
      const sheet = sheetOf(event.currentTarget);
      if (!sheet) return;
      const dy = Math.max(0, event.clientY - start.current);
      sheet.style.transition = "none";
      sheet.style.transform = `translateY(${dy}px)`;
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      if (start.current === null) return;
      const dy = event.clientY - start.current;
      start.current = null;
      settle(event.currentTarget);
      if (dy > SWIPE_CLOSE_PX) onClose();
    },
    onPointerCancel(event: PointerEvent<HTMLElement>) {
      start.current = null;
      settle(event.currentTarget);
    },
  };
}
