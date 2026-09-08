'use client';

import { useEffect, useState } from 'react';
import { cx, relativeTime } from '@/lib/format';
import type { Dataset } from '@/lib/types';
import type { LiveState } from '@/lib/useLiveData';

/** Says whether an advert feed is attached and how fresh it is. */
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
  // Relative times are client-only: the HTML may have been rendered hours ago.
  const [mounted, setMounted] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    setMounted(true);
    const timer = window.setInterval(() => tick((n) => n + 1), 20_000);
    return () => window.clearInterval(timer);
  }, []);

  const live = dataset.source === 'remote';
  const dot =
    state === 'error' ? 'bg-critical' : changed ? 'bg-clay' : live ? 'bg-good' : 'bg-faint';

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {live && state !== 'error' && (
          <span className={cx('absolute inline-flex h-full w-full animate-halo rounded-full', dot)} />
        )}
        <span className={cx('relative inline-flex h-2 w-2 rounded-full', dot)} />
      </span>
      <span className="eyebrow">
        {state === 'error'
          ? 'Reconnecting'
          : changed
            ? 'Adverts updated'
            : live
              ? 'Advert feed live'
              : 'No advert feed'}
      </span>
      {live && (
        <>
          <span className="eyebrow hidden lg:inline" suppressHydrationWarning>
            {mounted ? relativeTime(new Date(lastCheckedAt).toISOString()) : '—'}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            className="eyebrow underline decoration-rule underline-offset-4 hover:text-ink"
          >
            Check
          </button>
        </>
      )}
    </div>
  );
}
