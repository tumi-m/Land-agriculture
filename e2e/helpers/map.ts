import type { Page } from "@playwright/test";

/**
 * Finds the live MapLibre map in the page and stores it on `window.__liveMap`
 * for later `page.evaluate` calls.
 *
 * React's development StrictMode mounts, unmounts and remounts the map, so the
 * page can briefly hold two instances; the dead one still answers every
 * question. The map that owns a connected canvas is the live one. The map
 * object is private to AtlasMap, so it is reached through React's fiber tree
 * on the map container rather than exported for tests.
 */
export async function findLiveMap(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    type Fiber = {
      memoizedState?: unknown;
      return?: Fiber;
      child?: Fiber;
      sibling?: Fiber;
    };
    type LiveMap = {
      getCanvas: () => HTMLCanvasElement;
      getStyle: () => { sources?: Record<string, unknown> } | undefined;
    };
    const host = document.querySelector(".maplibregl-map");
    if (!host) return false;
    const fiberKey = Object.keys(host).find((key) =>
      key.startsWith("__reactFiber$"),
    );
    if (!fiberKey) return false;
    const seen = new Set<unknown>();
    const queue: Fiber[] = [
      (host as unknown as Record<string, Fiber>)[fiberKey],
    ];
    const candidates: LiveMap[] = [];
    while (queue.length) {
      const fiber = queue.shift() as Fiber;
      if (!fiber || seen.has(fiber)) continue;
      seen.add(fiber);
      let hook = fiber.memoizedState as
        | { memoizedState?: unknown; next?: unknown }
        | null
        | undefined;
      let guard = 0;
      while (hook && guard++ < 100) {
        const value = hook.memoizedState;
        if (
          value &&
          typeof value === "object" &&
          "current" in (value as Record<string, unknown>)
        ) {
          const current = (value as { current: unknown }).current;
          if (
            current &&
            typeof (current as { getStyle?: unknown }).getStyle === "function"
          ) {
            candidates.push(current as LiveMap);
          }
        }
        hook = hook.next as typeof hook;
      }
      if (fiber.child) queue.push(fiber.child);
      if (fiber.sibling) queue.push(fiber.sibling);
      if (fiber.return) queue.push(fiber.return);
    }
    const live = candidates.find((candidate) => {
      try {
        return candidate.getCanvas().isConnected;
      } catch {
        return false;
      }
    });
    if (!live) return false;
    (window as unknown as { __liveMap: unknown }).__liveMap = live;
    return true;
  });
}

/**
 * Waits until every named GeoJSON source has finished parsing, then returns
 * the feature count for the sources given in `expectFeatures`. A source that
 * never loads is exactly how the missing worker presented itself: the basemap
 * drew, the pins appeared, and every vector layer silently stayed empty.
 *
 * `querySourceFeatures` only sees tiles loaded for the viewport, so it is
 * asserted only for sources that cover the current view (the boundaries);
 * sources off-screen (rivers, notice parcels) are checked for parsing alone.
 */
export async function waitForVectorFeatures(
  page: Page,
  sources: string[],
  expectFeatures: string[] = sources,
  timeoutMs = 60_000,
): Promise<Record<string, number>> {
  await page.waitForFunction(
    ({ ids }) => {
      const map = (window as unknown as { __liveMap?: unknown }).__liveMap as
        | { isSourceLoaded: (id: string) => boolean }
        | undefined;
      if (!map) return false;
      return ids.every((id) => {
        try {
          return map.isSourceLoaded(id);
        } catch {
          return false;
        }
      });
    },
    { ids: sources },
    { timeout: timeoutMs },
  );
  if (expectFeatures.length > 0) {
    await page.waitForFunction(
      ({ ids }) => {
        const map = (window as unknown as { __liveMap?: unknown }).__liveMap as
          | {
              isSourceLoaded: (id: string) => boolean;
              querySourceFeatures: (id: string) => unknown[];
            }
          | undefined;
        if (!map) return false;
        return ids.every((id) => {
          try {
            return (
              map.isSourceLoaded(id) && map.querySourceFeatures(id).length > 0
            );
          } catch {
            return false;
          }
        });
      },
      { ids: expectFeatures },
      { timeout: timeoutMs },
    );
  }
  return page.evaluate((ids) => {
    const map = (window as unknown as { __liveMap?: unknown }).__liveMap as {
      querySourceFeatures: (id: string) => unknown[];
    };
    return Object.fromEntries(
      ids.map((id) => [id, map.querySourceFeatures(id).length]),
    );
  }, sources);
}
