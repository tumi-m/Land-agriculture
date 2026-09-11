"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "@/lib/format";

/**
 * A vertical slider with keyboard support (arrows, Home, End) and an
 * announced value. 0 to 1 maps to the track; the caller formats the label.
 */
export function Slider({
  value,
  onChange,
  label,
  format,
  min = 0,
  max = 1,
  step = 0.01,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  /** Formats the value for the aria-valuetext and the readout. */
  format?: (value: number) => string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  const id = useRef(`slider-${Math.random().toString(36).slice(2, 9)}`);
  const [track, setTrack] = useState<HTMLDivElement | null>(null);
  const shown = format ? format(value) : value.toFixed(2);

  const fromPointer = useCallback(
    (clientX: number) => {
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const raw = min + fraction * (max - min);
      onChange(Math.round(raw / step) * step);
    },
    [track, min, max, step, onChange],
  );

  useEffect(() => {
    if (!track) return;
    const move = (event: PointerEvent) => fromPointer(event.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    const down = (event: PointerEvent) => {
      fromPointer(event.clientX);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
    track.addEventListener("pointerdown", down);
    return () => track.removeEventListener("pointerdown", down);
  }, [track, fromPointer]);

  const fraction = max === min ? 0 : (value - min) / (max - min);
  const onKeyDown = (event: React.KeyboardEvent) => {
    const big = (max - min) / 10;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp")
      next = value + step;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown")
      next = value - step;
    else if (event.key === "PageUp") next = value + big;
    else if (event.key === "PageDown") next = value - big;
    else if (event.key === "Home") next = min;
    else if (event.key === "End") next = max;
    if (next === null) return;
    event.preventDefault();
    onChange(Math.min(max, Math.max(min, Math.round(next / step) * step)));
  };

  return (
    <div className={cx("slider", className)}>
      <div className="slider-head">
        <label id={`${id.current}-label`}>{label}</label>
        <span className="num slider-readout">{shown}</span>
      </div>
      <div
        ref={setTrack}
        role="slider"
        tabIndex={0}
        id={id.current}
        aria-labelledby={`${id.current}-label`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={shown}
        onKeyDown={onKeyDown}
        className="slider-track"
      >
        <span
          className="slider-fill"
          style={{ width: `${fraction * 100}%` }}
          aria-hidden="true"
        />
        <span
          className="slider-thumb"
          style={{ left: `${fraction * 100}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}