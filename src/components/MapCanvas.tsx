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
import { PROVINCES } from '@/content/provinces';
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

/**
 * Sequential bins over hectares advertised in the October 2020 tranche.
 * One hue, light to dark: the reader never has to learn a colour key by identity.
 */
const BINS = [
  { min: 1, max: 10_000, step: 'bg-land-100', token: '--land-100', label: 'under 10k' },
  { min: 10_000, max: 50_000, step: 'bg-land-300', token: '--land-300', label: '10k – 50k' },
  { min: 50_000, max: 150_000, step: 'bg-land-500', token: '--land-500', label: '50k – 150k' },
  { min: 150_000, max: Infinity, step: 'bg-land-700', token: '--land-700', label: '150k +' },
];

function binOf(hectares: number) {
  if (hectares <= 0) return null;
  return BINS.find((b) => hectares >= b.min && hectares < b.max) ?? BINS[BINS.length - 1];
}

function fitTo(box: { cx: number; cy: number; width: number; height: number }, pad = 44): View {
  const k = Math.max(
    MIN_K,
    Math.min(MAX_K, Math.min(MAP_WIDTH / (box.width + pad * 2), MAP_HEIGHT / (box.height + pad * 2))),
  );
  return { k, x: MAP_WIDTH / 2 - k * box.cx, y: MAP_HEIGHT / 2 - k * box.cy };
}

export default function MapCanvas({
  selected,
  onSelectProvince,
  adverts,
  activeAdvertId,
  onSelectAdvert,
}: {
  selected: ProvinceCode | null;
  onSelectProvince: (code: ProvinceCode | null) => void;
  adverts: Listing[];
  activeAdvertId: string | null;
  onSelectAdvert: (id: string) => void;
}) {
  const [view, setView] = useState<View>(IDENTITY);
  const [hover, setHover] = useState<ProvinceCode | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [pxScale, setPxScale] = useState(1);
  const frame = useRef<number | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const viewRef = useRef(view);
  viewRef.current = view;

  const markers = useMemo(
    () =>
      adverts.map((l) => {
        const [x, y] = project(l.coordinates);
        return { id: l.id, x, y, province: l.province, label: l.title };
      }),
    [adverts],
  );

  const animateTo = useCallback((target: View) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    const from = viewRef.current;
    const start = performance.now();
    const reduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 0 : 640;

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

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const zoomBy = useCallback((factor: number, origin?: { x: number; y: number }) => {
    const v = viewRef.current;
    const k = Math.max(MIN_K, Math.min(MAX_K, v.k * factor));
    const px = origin?.x ?? MAP_WIDTH / 2;
    const py = origin?.y ?? MAP_HEIGHT / 2;
    setView({ k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k });
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
  const hairline = pxScale / view.k;
  const hovered = hover ? PROVINCES[hover] : null;

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
        aria-label="Map of South Africa shaded by hectares of state agricultural land advertised in October 2020. Select a province for its figures and application office."
        onPointerDown={(e) => {
          if (!zoomed) return;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
          setDragging(true);
        }}
        onPointerMove={(e) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (rect) setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          const d = drag.current;
          if (!d || !rect) return;
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
          setPointer(null);
        }}
      >
        <defs>
          <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="rgb(var(--ink))" floodOpacity="0.16" />
          </filter>
        </defs>

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {PROVINCE_SHAPES.map((shape) => {
            const record = PROVINCES[shape.code];
            const bin = binOf(record.advertised2020);
            const isSelected = selected === shape.code;
            const isDimmed = selected !== null && !isSelected;
            const isHovered = hover === shape.code && !isDimmed;

            return (
              <path
                key={shape.code}
                d={cachedPath(`p-${shape.code}`, shape.geometry)}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`${record.name}. ${
                  record.advertised2020 > 0
                    ? `${group(record.advertised2020)} hectares advertised.`
                    : 'Not included in the October 2020 tranche.'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectProvince(isSelected ? null : shape.code);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectProvince(isSelected ? null : shape.code);
                  }
                }}
                onPointerEnter={() => setHover(shape.code)}
                fill={
                  isDimmed
                    ? 'rgb(var(--rule))'
                    : bin
                      ? `rgb(var(${bin.token}))`
                      : 'rgb(var(--raised))'
                }
                stroke={
                  isSelected || isHovered
                    ? 'rgb(var(--clay))'
                    : isDimmed
                      ? 'rgb(var(--ink) / 0.15)'
                      : 'rgb(var(--ink) / 0.45)'
                }
                strokeWidth={(isSelected ? 2.6 : isHovered ? 2 : 0.8) * hairline}
                strokeLinejoin="round"
                opacity={isDimmed ? 0.5 : 1}
                filter={isSelected ? 'url(#lift)' : undefined}
                className="cursor-pointer transition-[opacity,stroke] duration-300 ease-out focus:outline-none focus-visible:stroke-clay"
              />
            );
          })}

          {selected &&
            DISTRICTS_BY_PROVINCE[selected].map((district) => (
              <path
                key={district.id}
                d={cachedPath(`d-${district.id}`, district.geometry)}
                fill="none"
                stroke="rgb(var(--ink) / 0.4)"
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
                  strokeWidth={2.4}
                  strokeLinejoin="round"
                  style={{ fontSize: 10, letterSpacing: '0.1em' }}
                >
                  {district.name.replace(/ (District|Metro)$/, '')}
                </text>
              );
            })}

          {markers.map((m) => {
            if (selected !== null && m.province !== selected) return null;
            const active = activeAdvertId === m.id;
            return (
              <g key={m.id} transform={`translate(${m.x} ${m.y})`}>
                {active && (
                  <circle
                    r={6 * hairline}
                    fill="rgb(var(--clay))"
                    className="origin-center animate-halo"
                    style={{ transformBox: 'fill-box' }}
                  />
                )}
                <circle
                  r={(active ? 6 : 4.5) * hairline}
                  fill="rgb(var(--clay))"
                  stroke="rgb(var(--surface))"
                  strokeWidth={2 * hairline}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAdvert(m.id);
                  }}
                >
                  <title>{m.label}</title>
                </circle>
              </g>
            );
          })}

          {PROVINCE_LABELS.map(({ code, x, y }) => {
            if (selected !== null) return null;
            const record = PROVINCES[code];
            const dark = record.advertised2020 >= 150_000;
            return (
              <g key={code} transform={`translate(${x} ${y}) scale(${hairline})`} pointerEvents="none">
                <text
                  textAnchor="middle"
                  className={dark ? 'fill-paper' : 'fill-ink'}
                  paintOrder="stroke"
                  stroke={dark ? 'rgb(var(--land-700))' : 'rgb(var(--surface))'}
                  strokeWidth={2.4}
                  strokeLinejoin="round"
                  style={{ fontSize: 12.5, letterSpacing: '0.02em', fontWeight: 600 }}
                >
                  {record.short}
                </text>
                <text
                  y={15}
                  textAnchor="middle"
                  className={dark ? 'fill-paper/85' : 'fill-muted'}
                  paintOrder="stroke"
                  stroke={dark ? 'rgb(var(--land-700))' : 'rgb(var(--surface))'}
                  strokeWidth={2.4}
                  strokeLinejoin="round"
                  style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)' }}
                >
                  {record.advertised2020 > 0 ? `${group(record.advertised2020)} ha` : '—'}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {hovered && pointer && !dragging && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 w-[17rem] border border-ink/15 bg-raised p-3 shadow-lg"
          style={{
            left: Math.min(pointer.x + 16, 999),
            top: pointer.y + 16,
            transform: pointer.x > 320 ? 'translateX(-100%) translateX(-32px)' : undefined,
          }}
        >
          <p className="font-display text-lg leading-tight text-ink">{hovered.name}</p>
          <dl className="mt-2 space-y-1 text-xs">
            <Reading label="Advertised 2020" value={hovered.advertised2020 > 0 ? `${group(hovered.advertised2020)} ha` : 'excluded'} />
            <Reading label="Released Feb 2020" value={hovered.released2020 !== null ? `${group(hovered.released2020)} ha` : '—'} />
            {hovered.stateLandSharePct !== null && (
              <Reading label="State land" value={`${hovered.stateLandSharePct}%`} />
            )}
          </dl>
          <p className="mt-2 border-t border-rule pt-1.5 text-2xs leading-snug text-muted">
            {hovered.commodities.slice(0, 3).join(' · ')}
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-3">
        <div className="pointer-events-auto border border-rule bg-surface/90 px-2.5 py-2 backdrop-blur">
          <p className="eyebrow mb-1.5">Hectares advertised, Oct 2020</p>
          <div className="flex items-center gap-0">
            {BINS.map((b) => (
              <div key={b.label} className="flex flex-col items-start">
                <span className={cx('block h-2.5 w-12', b.step)} />
                <span className="num mt-1 pr-2 text-2xs text-muted">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pointer-events-auto flex gap-1.5">
          <button type="button" onClick={() => zoomBy(1.5)} className="btn px-2.5 py-1.5" aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => zoomBy(1 / 1.5)} className="btn px-2.5 py-1.5" aria-label="Zoom out">
            −
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectProvince(null);
              animateTo(IDENTITY);
            }}
            className="btn px-2.5 py-1.5"
            aria-label="Reset the map"
            disabled={!zoomed && selected === null}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 whitespace-nowrap">
      <dt className="text-muted">{label}</dt>
      <dd className="num text-ink">{value}</dd>
    </div>
  );
}
