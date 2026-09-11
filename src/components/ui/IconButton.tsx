"use client";

import { cx } from "@/lib/format";

/** A round icon button. The icon must carry an accessible name from the caller. */
export function IconButton({
  label,
  onClick,
  pressed,
  disabled,
  children,
  className,
}: {
  /** Accessible name — never omit it. */
  label: string;
  onClick?: () => void;
  pressed?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cx("icon-button", className)}
    >
      {children}
    </button>
  );
}