import { cx } from '@/lib/format';
import type { ListingImage } from '@/lib/types';

/**
 * Draws the survey-plate illustration used wherever a listing has no photograph.
 *
 * It is deliberately a diagram, not a fake photo: nothing here should be
 * mistaken for imagery of a real parcel. Records that carry a real `src` render
 * that instead.
 */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const W = 800;
const H = 520;

function blob(cx0: number, cy0: number, r: number, wobble: number, rand: () => number) {
  const points: string[] = [];
  const steps = 22;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = r * (1 - wobble / 2 + rand() * wobble);
    points.push(`${(cx0 + Math.cos(a) * rr * 1.45).toFixed(1)},${(cy0 + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `M${points.join('L')}Z`;
}

export default function FieldPlate({
  image,
  seed,
  className,
}: {
  image: ListingImage;
  seed: string;
  className?: string;
}) {
  const rand = seeded(seed + (image.variant ?? 'aerial'));
  const variant = image.variant ?? 'aerial';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={image.alt}
      preserveAspectRatio="xMidYMid slice"
      className={cx('h-full w-full', className)}
    >
      <defs>
        <pattern id={`grid-${seed}-${variant}`} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="rgb(var(--rule))" strokeWidth="1" opacity="0.55" />
        </pattern>
        <linearGradient id={`wash-${seed}-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--veld))" stopOpacity="0.16" />
          <stop offset="100%" stopColor="rgb(var(--signal))" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill="rgb(var(--surface))" />
      <rect width={W} height={H} fill={`url(#grid-${seed}-${variant})`} />
      <rect width={W} height={H} fill={`url(#wash-${seed}-${variant})`} />

      {variant === 'contour' &&
        Array.from({ length: 7 }, (_, i) => (
          <path
            key={i}
            d={blob(400, 260, 40 + i * 32, 0.22, rand)}
            fill="none"
            stroke="rgb(var(--veld))"
            strokeOpacity={0.2 + i * 0.06}
            strokeWidth={i === 3 ? 2 : 1}
          />
        ))}

      {variant === 'strips' && (
        <g>
          {Array.from({ length: 9 }, (_, i) => {
            const y = 70 + i * 44;
            const skew = (rand() - 0.5) * 40;
            return (
              <path
                key={i}
                d={`M60 ${y} L${740 + skew} ${y - 18} L${740 + skew} ${y + 24} L60 ${y + 38} Z`}
                fill="rgb(var(--veld))"
                fillOpacity={i % 3 === 0 ? 0.2 : 0.09}
                stroke="rgb(var(--veld))"
                strokeOpacity="0.35"
              />
            );
          })}
        </g>
      )}

      {variant === 'water' && (
        <g>
          <path
            d={blob(250, 330, 78, 0.3, rand)}
            fill="rgb(var(--signal))"
            fillOpacity="0.12"
            stroke="rgb(var(--signal))"
            strokeOpacity="0.5"
          />
          <path
            d={blob(600, 180, 52, 0.35, rand)}
            fill="rgb(var(--signal))"
            fillOpacity="0.12"
            stroke="rgb(var(--signal))"
            strokeOpacity="0.5"
          />
          <path
            d="M250 330 C 360 300, 420 250, 600 180"
            fill="none"
            stroke="rgb(var(--ink))"
            strokeOpacity="0.45"
            strokeWidth="2"
            strokeDasharray="10 7"
          />
          {[
            [250, 330],
            [600, 180],
          ].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="6" fill="rgb(var(--signal))" />
          ))}
        </g>
      )}

      {variant === 'sheds' && (
        <g>
          {Array.from({ length: 4 }, (_, i) => {
            const x = 110 + i * 160;
            const h = 190 + rand() * 60;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={160}
                  width={104}
                  height={h}
                  fill="rgb(var(--raised))"
                  stroke="rgb(var(--ink))"
                  strokeOpacity="0.55"
                />
                <path
                  d={`M${x} 160 L${x + 52} 118 L${x + 104} 160`}
                  fill="rgb(var(--signal))"
                  fillOpacity="0.16"
                  stroke="rgb(var(--ink))"
                  strokeOpacity="0.4"
                />
                <line
                  x1={x + 52}
                  y1={160 + h}
                  x2={x + 52}
                  y2={160 + h + 26}
                  stroke="rgb(var(--ink))"
                  strokeOpacity="0.3"
                  strokeDasharray="4 4"
                />
              </g>
            );
          })}
          <line x1="60" y1={412} x2="740" y2={412} stroke="rgb(var(--ink))" strokeOpacity="0.3" />
        </g>
      )}

      {variant === 'aerial' && (
        <g>
          <path
            d={blob(400, 260, 150, 0.18, rand)}
            fill="rgb(var(--veld))"
            fillOpacity="0.14"
            stroke="rgb(var(--signal))"
            strokeWidth="2.5"
          />
          {Array.from({ length: 5 }, (_, i) => (
            <path
              key={i}
              d={blob(400, 260, 46 + i * 22, 0.4, rand)}
              fill="none"
              stroke="rgb(var(--ink))"
              strokeOpacity="0.12"
            />
          ))}
          <circle cx="400" cy="260" r="5" fill="rgb(var(--signal))" />
        </g>
      )}

      <g fontFamily="var(--font-mono)" fontSize="13" fill="rgb(var(--faint))">
        <text x="24" y="34" letterSpacing="1.6">
          {variant.toUpperCase()} PLATE
        </text>
        <text x={W - 24} y={H - 22} textAnchor="end" letterSpacing="1.6">
          NOT TO SCALE
        </text>
      </g>
      <rect
        x="12"
        y="12"
        width={W - 24}
        height={H - 24}
        fill="none"
        stroke="rgb(var(--rule))"
        strokeWidth="1"
      />
    </svg>
  );
}
