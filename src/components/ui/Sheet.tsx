"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cx } from "@/lib/format";

export type SheetSnap = "peek" | "half" | "full";

const SNAPS: SheetSnap[] = ["peek", "half", "full"];

/**
 * A bottom sheet on phones (three snaps, drag handle, Escape to close, focus
 * returned to the opener) and a right-hand panel 400 px wide from 1024 px.
 * At full it traps focus; at peek and half the stage stays interactive.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  snap = "half",
  onSnapChange,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  snap?: SheetSnap;
  onSnapChange?: (snap: SheetSnap) => void;
  className?: string;
}) {
  const openerRef = useRef<HTMLElement | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const rememberOpener = useCallback(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
  }, []);

  useEffect(() => {
    if (!open) return;
    rememberOpener();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      // Trap focus only at full snap.
      if (event.key !== "Tab" || snap !== "full" || !sheetRef.current) return;
      const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose, snap, rememberOpener]);

  useEffect(() => {
    if (open) return;
    // Give focus back to whoever opened it.
    openerRef.current?.focus();
    openerRef.current = null;
  }, [open]);

  if (!open) return null;

  const snapDown = () => {
    const index = SNAPS.indexOf(snap);
    const next = SNAPS[Math.min(index + 1, SNAPS.length - 1)];
    onSnapChange?.(next);
  };
  const snapUp = () => {
    const index = SNAPS.indexOf(snap);
    const next = SNAPS[Math.max(index - 1, 0)];
    onSnapChange?.(next);
  };

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal={snap === "full"}
      aria-label={title}
      className={cx("sheet", `sheet-${snap}`, className)}
      style={
        dragOffset
          ? { transform: `translateY(${dragOffset}px)`, transition: "none" }
          : undefined
      }
      data-chrome
    >
      <div
        className="sheet-handle"
        onPointerDown={(event) => {
          dragStart.current = event.clientY;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragStart.current === null) return;
          setDragOffset(Math.max(0, event.clientY - dragStart.current));
        }}
        onPointerUp={() => {
          if (dragStart.current === null) return;
          const moved = dragOffset;
          dragStart.current = null;
          setDragOffset(0);
          if (moved > 60) snapDown();
          else if (moved < -60) snapUp();
        }}
      >
        <span aria-hidden="true" />
        <button
          type="button"
          aria-label="Make the sheet taller"
          className="sheet-snap sheet-snap-up"
          onClick={snapUp}
          disabled={snap === "full"}
        >
          ⌃
        </button>
        <button
          type="button"
          aria-label="Make the sheet shorter"
          className="sheet-snap sheet-snap-down"
          onClick={snapDown}
          disabled={snap === "peek"}
        >
          ⌄
        </button>
        <button
          type="button"
          aria-label="Close"
          className="sheet-close"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="sheet-body">{children}</div>
    </div>
  );
}