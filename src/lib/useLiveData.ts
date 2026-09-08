'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dataset } from './types';

const POLL_MS = 30_000;

export type LiveState = 'idle' | 'checking' | 'error';

interface Live {
  dataset: Dataset;
  state: LiveState;
  /** Set for a few seconds after new data lands, so the UI can announce it. */
  changed: boolean;
  lastCheckedAt: number;
  refresh: () => void;
}

/**
 * Keeps the page in step with the feed.
 *
 * Polls /api/parcels with the ETag it last saw, so an unchanged dataset costs a
 * 304 and nothing re-renders. Polling stops while the tab is hidden and fires
 * once immediately when it comes back, which is what makes a returning tab feel
 * current without hammering the origin.
 */
export function useLiveData(initial: Dataset): Live {
  const [dataset, setDataset] = useState(initial);
  const [state, setState] = useState<LiveState>('idle');
  const [changed, setChanged] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState(() => Date.now());
  const etag = useRef<string | null>(null);
  const inFlight = useRef(false);

  const check = useCallback(async () => {
    if (inFlight.current || typeof document === 'undefined' || document.hidden) return;
    inFlight.current = true;
    setState('checking');
    try {
      const res = await fetch('/api/parcels', {
        cache: 'no-store',
        headers: etag.current ? { 'if-none-match': etag.current } : undefined,
      });
      setLastCheckedAt(Date.now());
      if (res.status === 304) {
        setState('idle');
        return;
      }
      if (!res.ok) {
        setState('error');
        return;
      }
      etag.current = res.headers.get('etag');
      const next = (await res.json()) as Dataset;
      setState('idle');
      setDataset((prev) => {
        if (prev.revision === next.revision && prev.updatedAt === next.updatedAt) return prev;
        setChanged(true);
        return next;
      });
    } catch {
      setState('error');
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!changed) return;
    const timer = window.setTimeout(() => setChanged(false), 6000);
    return () => window.clearTimeout(timer);
  }, [changed]);

  useEffect(() => {
    const timer = window.setInterval(check, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [check]);

  return { dataset, state, changed, lastCheckedAt, refresh: check };
}
