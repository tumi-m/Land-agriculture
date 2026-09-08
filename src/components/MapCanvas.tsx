'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DISTRICTS_BY_PROVINCE,
  DISTRICT_BOXES,
  MAP_HEIGHT,
  MAP_WIDTH,
  PROVINCE_BOXES,
  PROVINCE_LABELS,
  PROVINCE_SHAPES,
  cachedPath,
  project,
} from '@/lib/geo';
import { PROVINCES } from '@/lib/provinces';
import { cx, group } from '@/lib/format';
import type { Listing, ProvinceCode } from '@/lib/types';

interface View {
  k: number;
  x: number;
  y: number;
}

const IDENTITY: View = { k: 1, x: 0, y: 0 };
const MIN_K = 1;
const MAX_K = 16;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function fitTo(box: { cx: number; cy: number; width: number; height: number }, pad = 44): View {
  const k = Math.max(
    MIN_K,
    Math.min(MAX_K, Math.min(MAP_WIDTH / (box.width + pad * 2), MAP_HEIGHT / (box.height + pad * 2))),
  );
  return { k, x: MAP_WIDTH / 2 - k * box.cx, y: MAP_HEIGHT / 2 - k * box.cy };
}

export default function MapCanvas({
  listings,
  selected,
  onSelectProvince,
  activeListingId,
  onSelectListing,
}: {
  listings: Listing[];
  selected: ProvinceCode | null;
  onSelectProvince: (code: ProvinceCode | null) => void;
  activeListingId: string | null;
  onSelectListing: (id: string) => void;
}) {
  const [view, setView] = useState<View>(IDENTITY);
  const [hover, setHover] = useState<ProvinceCode | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // User units per CSS pixel. Map furniture — strokes, labels, markers — is sized
  // in screen pixels, so it stays legible whether the map is 1 100 px wide or 350.
  const [pxScale, setPxScale] = useState(1);
  const frame = useRef<number | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<ProvinceCode, { parcels: number; hectares: number }>();
    for (const l of listings) {
      const entry = map.get(l.province) ?? { parcels: 0, hectares: 0 };
      entry.parcels += 1;
      entry.hectares += l.sizeHa;
      map.set(l.province, entry);
    }
    return map;
  }, [listings]);

  // Shade by extent rather than count: hectares are what an applicant is choosing between.
  const maxHectares = useMemo(
    () => Math.max(1, ...Array.from(counts.values(), (c) => c.hectares)),
    [counts],
  );

  const markers = useMemo(
    () =>
      listings.map((l) => {
        const [x, y] = project(l.coordinates);
        return {
          id: l.id,
          x,
          y,
          province: l.province,
          status: l.status,
          label: `${l.title} — ${group(Math.round(l.sizeHa))} ha`,
        };
      }),
    [listings],
  );

  // animateTo reads the live view without re-binding on every frame.
  const viewRef = useRef(view);
  viewRef.current = view;

  const animateTo = useCallback((target: View) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    const start = performance.now();
    const from = viewRef.current;
    const duration =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 620;

    const step = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const e = easeOut(t);
      setView({
        k: from.k + (target.k - from.k) * e,
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
      });
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    animateTo(selected ? fitTo(PROVINCE_BOXES[selected]) : IDENTITY);
  }, [selected, animateTo]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  const zoomBy = useCallback((factor: number, origin?: { x: number; y: number }) => {
    const v = viewRef.current;
    const k = Math.max(MIN_K, Math.min(MAX_K, v.k * factor));
    const px = origin?.x ?? MAP_WIDTH / 2;
    const py = origin?.y ?? MAP_HEIGHT / 2;
    setView({
      k,
      x: px - ((px - v.x) / v.k) * k,
      y: py - ((py - v.y) / v.k) * k,
    });
  }, []);

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * MAP_WIDTH,
      y: ((clientY - rect.top) / rect.height) * MAP_HEIGHT,
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setPxScale(MAP_WIDTH / width);
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  // Non-passive so the page does not scroll while zooming the map.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      zoomBy(Math.exp(-event.deltaY * 0.0016), toSvg(event.clientX, event.clientY));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomBy, toSvg]);

  const zoomed = view.k > 1.02;
  const showDistricts = selected !== null || view.k > 2.6;
  const hairline = pxScale / view.k;

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        id="map"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className={cx(
          'h-full w-full touch-none select-none',
          dragging ? 'cursor-grabbing' : zoomed ? 'cursor-grab' : 'cursor-default',
        )}
        role="application"
        aria-label="Map of South Africa. Select a province to isolate it and list its parcels."
        onPointerDown={(e) => {
          if (!zoomed) return;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
          setDragging(true);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !svgRef.current) return;
          const rect = svgRef.current.getBoundingClientRect();
          const scale = MAP_WIDTH / rect.width;
          setView((v) => ({
            ...v,
            x: d.vx + (e.clientX - d.x) * scale,
            y: d.vy + (e.clientY - d.y) * scale,
          }));
        }}
        onPointerUp={() => {
          drag.current = null;
          setDragging(false);
        }}
        onPointerLeave={() => {
          drag.current = null;
          setDragging(false);
          setHover(null);
        }}
      >
        <defs>
          <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgb(var(--ink))" floodOpacity="0.14" />
          </filter>
        </defs>

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {PROVINCE_SHAPES.map((province) => {
            const stats = counts.get(province.code);
            const parcels = stats?.parcels ?? 0;
            const intensity =
              parcels === 0 ? 0 : 0.14 + ((stats?.hectares ?? 0) / maxHectares) * 0.4;
            const isSelected = selected === province.code;
            const isDimmed = selected !== null && !isSelected;
            const isHovered = hover === province.code;

            return (
              <path
                key={province.code}
                d={cachedPath(`p-${province.code}`, province.geometry)}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`${PROVINCES[province.code].name}, ${parcels} ${
                  parcels === 1 ? 'parcel' : 'parcels'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectProvince(isSelected ? null : province.code);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectProvince(isSelected ? null : province.code);
                  }
                }}
                onPointerEnter={() => setHover(province.code)}
                fill={
                  parcels === 0
                    ? 'rgb(var(--raised))'
                    : `rgb(var(--veld) / ${isHovered && !isDimmed ? intensity + 0.14 : intensity})`
                }
                stroke={isSelected ? 'rgb(var(--signal))' : 'rgb(var(--ink) / 0.5)'}
                strokeWidth={(isSelected ? 2.4 : 0.9) * hairline}
                strokeLinejoin="round"
                opacity={isDimmed ? 0.16 : 1}
                filter={isSelected ? 'url(#lift)' : undefined}
                className="cursor-pointer transition-[opacity,fill] duration-300 ease-out focus:outline-none focus-visible:stroke-signal"
              />
            );
          })}

          {showDistricts &&
            (selected ? DISTRICTS_BY_PROVINCE[selected] : []).map((district) => (
              <path
                key={district.id}
                d={cachedPath(`d-${district.id}`, district.geometry)}
                fill="none"
                stroke="rgb(var(--ink) / 0.45)"
                strokeWidth={1.1 * hairline}
                strokeDasharray={`${4 * hairline} ${3 * hairline}`}
                pointerEvents="none"
              />
            ))}

          {selected &&
            view.k > 2 &&
            DISTRICTS_BY_PROVINCE[selected].map((district) => {
              const box = DISTRICT_BOXES[district.id];
              return (
                <text
                  key={`label-${district.id}`}
                  transform={`translate(${box.cx} ${box.cy}) scale(${hairline})`}
                  textAnchor="middle"
                  pointerEvents="none"
                  className="fill-muted font-mono uppercase"
                  paintOrder="stroke"
                  stroke="rgb(var(--surface))"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  style={{ fontSize: 10, letterSpacing: '0.1em' }}
                >
                  {district.name.replace(/ (District|Metro)$/, '')}
                </text>
              );
            })}

          {markers.map((m) => {
            const dimmed = selected !== null && m.province !== selected;
            const active = activeListingId === m.id;
            if (dimmed) return null;
            return (
              <g key={m.id} transform={`translate(${m.x} ${m.y})`}>
                {active && (
                  <circle
                    r={6 * hairline}
                    fill="rgb(var(--signal))"
                    className="origin-center animate-pulse-ring"
                    style={{ transformBox: 'fill-box' }}
                  />
                )}
                <circle
                  r={(active ? 6 : 4.2) * hairline}
                  fill="rgb(var(--signal))"
                  fillOpacity={active ? 1 : 0.9}
                  stroke="rgb(var(--paper))"
                  strokeWidth={2 * hairline}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectListing(m.id);
                  }}
                >
                  <title>{m.label}</title>
                </circle>
              </g>
            );
          })}

          {PROVINCE_LABELS.map(({ code, x, y }) => {
            const stats = counts.get(code);
            if (selected !== null) return null;
            return (
              <g
                key={code}
                transform={`translate(${x} ${y}) scale(${hairline})`}
                pointerEvents="none"
                className="transition-opacity duration-300"
              >
                <text
                  textAnchor="middle"
                  className="fill-ink font-mono uppercase"
                  paintOrder="stroke"
                  stroke="rgb(var(--surface))"
                  strokeWidth={3.5}
                  strokeLinejoin="round"
                  style={{ fontSize: 13, letterSpacing: '0.12em' }}
                >
                  {PROVINCES[code].short}
                </text>
                <text
                  y={16}
                  textAnchor="middle"
                  className="fill-muted font-mono tabular-nums"
                  paintOrder="stroke"
                  stroke="rgb(var(--surface))"
                  strokeWidth={3.5}
                  strokeLinejoin="round"
                  style={{ fontSize: 11 }}
                >
                  {stats ? `${stats.parcels} · ${group(Math.round(stats.hectares))} ha` : '—'}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="pointer-events-none absolute bottom-3 right-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => zoomBy(1.5)}
          className="btn pointer-events-auto justify-center px-2.5"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.5)}
          className="btn pointer-events-auto justify-center px-2.5"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            onSelectProvince(null);
            animateTo(IDENTITY);
          }}
          className="btn pointer-events-auto justify-center px-2.5"
          aria-label="Reset view"
          disabled={!zoomed && selected === null}
        >
          ⤾
        </button>
      </div>

      <p className="pointer-events-none absolute bottom-3 left-3 max-w-[22ch] font-mono text-2xs uppercase leading-relaxed tracking-[0.1em] text-faint">
        Scroll to zoom · drag to pan · click a province
      </p>
    </div>
  );
}
