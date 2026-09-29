"use client";

import { useTween } from "@/lib/useTween";

/**
 * A figure that counts to its value when it appears and glides when it
 * changes, so moving from one place to the next shows which way the number
 * went. The moving copy is hidden from screen readers; they hear the final
 * value once. Before mount, and under reduced motion, it is simply the value.
 */
export function CountUp({
  value,
  format,
  duration = 800,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
}) {
  const shown = useTween(value, duration);
  const final = format(value);
  // A figure space keeps the width still while the digits run.
  const moving = format(shown ?? value).padStart(final.length, " ");
  return (
    <>
      <span aria-hidden="true">{moving}</span>
      <span className="sr-only">{final}</span>
    </>
  );
}
