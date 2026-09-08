'use client';

import { useEffect, useState } from 'react';
import { cx, relativeTime } from '@/lib/format';
import type { Dataset } from '@/lib/types';
import type { LiveState } from '@/lib/useLiveData';

export default function LiveStatus({
  dataset,
  state,
  changed,
  lastCheckedAt,
  onRefresh,
}: {
  dataset: Dataset;
  state: LiveState;
  changed: boolean;
  lastCheckedAt: number;
  onRefresh: () => void;
}) {
  // Relative times depend on the clock, so they are client-only: rendering them
  // during SSR would hand the browser a timestamp that is already stale.
  const [mounted, setMounted] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    setMounted(true);
    const timer = window.setInterval(() => tick((n) => n + 1), 20_000);
    return () => window.clearInterval(timer);
  }, []);

  const dotColour =
    state === 'error' ? 'bg-alert' : changed ? 'bg-signal' : state === 'checking' ? 'bg-faint' : 'bg-veld';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {state !== 'error' && (
            <span
              className={cx('absolute inline-flex h-full w-full animate-pulse-ring rounded-full', dotColour)}
            />
          )}
          <span className={cx('relative inline-flex h-2 w-2 rounded-full', dotColour)} />
        </span>
        <span className="label text-muted">
          {state === 'error'
            ? 'Reconnecting'
            : changed
              ? 'Updated just now'
              : dataset.source === 'remote'
                ? 'Live feed'
                : 'Seed dataset'}
        </span>
      </span>

      <span className="label hidden sm:inline" title={dataset.updatedAt} suppressHydrationWarning>
        {mounted
          ? `Data ${relativeTime(dataset.updatedAt)} · checked ${relativeTime(
              new Date(lastCheckedAt).toISOString(),
            )}`
          : 'Checking feed'}
      </span>

      <button type="button" onClick={onRefresh} className="label underline decoration-rule underline-offset-4 hover:text-ink">
        Check now
      </button>
    </div>
  );
}
