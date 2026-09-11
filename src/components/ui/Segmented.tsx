"use client";

import { cx } from "@/lib/format";

/** A pressed-state button in a group. Keyboard roving-tabindex is the caller's job. */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { id: V; label: string; hint?: string }[];
  value: V;
  onChange: (value: V) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cx("segmented", className)}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          className={cx(value === option.id && "is-active")}
          onClick={() => onChange(option.id)}
        >
          {option.label}
          {option.hint && <small>{option.hint}</small>}
        </button>
      ))}
    </div>
  );
}