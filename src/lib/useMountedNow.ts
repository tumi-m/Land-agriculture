'use client';

import { useEffect, useState } from 'react';

/**
 * The wall clock, but only after mount.
 *
 * Anything derived from `Date.now()` differs between the moment the HTML was
 * rendered and the moment it hydrates — a page prerendered at build time can be
 * hours stale. Returning null on the server lets callers fall back to a fixed
 * reference (the dataset timestamp) for the first paint and switch to the real
 * clock once the browser takes over.
 */
export function useMountedNow(intervalMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
