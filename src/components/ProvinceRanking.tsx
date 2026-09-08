'use client';

import {
  ADVERTISED_ACCOUNTED,
  ADVERTISED_FARMS,
  ADVERTISED_TOTAL_PUBLISHED,
  PROVINCES,
  PROVINCE_ORDER,
} from '@/content/provinces';
import { cx, group } from '@/lib/format';
import type { ProvinceCode } from '@/lib/types';

const MAX = Math.max(...PROVINCE_ORDER.map((c) => PROVINCES[c].advertised2020));

/**
 * Magnitude, one series — so a sequential hue and a table beside the bars rather
 * than a second axis. Values sit at the bar tip; the columns carry everything else.
 */
export default function ProvinceRanking({
  selected,
  onSelect,
}: {
  selected: ProvinceCode | null;
  onSelect: (code: ProvinceCode) => void;
}) {
  const ranked = [...PROVINCE_ORDER].sort(
    (a, b) => PROVINCES[b].advertised2020 - PROVINCES[a].advertised2020,
  );

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-sm">
          <caption className="sr-only">
            Hectares of state agricultural land advertised per province in October 2020, with the
            February 2020 release and the share of each province that is state land.
          </caption>
          <thead>
            <tr className="border-b border-ink text-left">
              <th scope="col" className="eyebrow pb-2 font-normal">
                Province
              </th>
              <th scope="col" className="eyebrow pb-2 font-normal">
                Advertised Oct 2020
              </th>
              <th scope="col" className="eyebrow pb-2 text-right font-normal">
                Released Feb
              </th>
              <th scope="col" className="eyebrow hidden pb-2 text-right font-normal xl:table-cell">
                State land
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((code) => {
              const p = PROVINCES[code];
              const width = MAX > 0 ? (p.advertised2020 / MAX) * 100 : 0;
              const isSelected = selected === code;
              return (
                <tr
                  key={code}
                  onClick={() => onSelect(code)}
                  className={cx(
                    'cursor-pointer border-b border-rule transition-colors duration-150',
                    isSelected ? 'bg-clay-soft/50' : 'hover:bg-clay-soft/30',
                  )}
                >
                  <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(code);
                      }}
                      className="text-left text-ink underline decoration-transparent underline-offset-4 transition-colors hover:decoration-clay"
                    >
                      {p.name}
                    </button>
                  </th>
                  <td className="w-1/2 py-2.5 pr-4">
                    {p.advertised2020 > 0 ? (
                      <span className="flex items-center gap-2">
                        <span
                          className={cx(
                            'block h-4 rounded-r-[4px] transition-colors duration-200',
                            isSelected ? 'bg-clay' : 'bg-land-500',
                          )}
                          style={{ width: `${Math.max(width, 1.5)}%` }}
                        />
                        <span className="num shrink-0 text-xs text-ink">
                          {group(p.advertised2020)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted">
                        Excluded — reserve already taken up
                      </span>
                    )}
                  </td>
                  <td className="num py-2.5 text-right text-xs text-muted">
                    {p.released2020 !== null ? group(p.released2020) : '—'}
                  </td>
                  <td className="num hidden py-2.5 text-right text-xs text-muted xl:table-cell">
                    {p.stateLandSharePct !== null ? `${p.stateLandSharePct}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 max-w-reading text-xs leading-relaxed text-muted">
        The October 2020 drive was announced as{' '}
        <span className="font-medium text-ink">{group(ADVERTISED_TOTAL_PUBLISHED)} ha</span> across{' '}
        <span className="font-medium text-ink">{ADVERTISED_FARMS}</span> farms. The published provincial
        breakdown accounts for <span className="font-medium text-ink">{group(ADVERTISED_ACCOUNTED)} ha</span>{' '}
        of that — the balance is not split out by province in the figures released at the time, so it
        is shown here as it was published rather than reconciled.
      </p>
    </div>
  );
}
