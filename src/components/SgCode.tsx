'use client';

import { useState } from 'react';
import { cx } from '@/lib/format';

const CLEAN = /[^0-9A-Za-z]/g;

/**
 * Every advertised farm is identified by its 21-character Surveyor-General code
 * rather than its name. Getting it wrong on the form identifies a different
 * parcel, so this checks the shape of what you have and says where to get it.
 *
 * It checks format only — there is no public lookup wired in here, and the app
 * does not pretend to resolve a code to a parcel.
 */
export default function SgCode() {
  const [value, setValue] = useState('');
  const cleaned = value.replace(CLEAN, '').toUpperCase();
  const length = cleaned.length;
  const ok = length === 21;
  const touched = length > 0;

  return (
    <div className="border border-rule bg-surface p-5">
      <p className="eyebrow">Parcel identity</p>
      <p className="mt-1 font-display text-xl leading-tight text-ink">
        The 21-character Surveyor-General code
      </p>
      <p className="mt-2 max-w-measure text-sm leading-relaxed text-muted">
        Farms are advertised by name, but identified legally by this code. It appears on the advert,
        the title deed and the SG diagram. Copy it across exactly — a farm name and portion number
        alone will not pin down the parcel.
      </p>

      <label htmlFor="sg" className="eyebrow mt-4 block">
        Check a code
      </label>
      <input
        id="sg"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste the code from the advert"
        spellCheck={false}
        className="num mt-1.5 w-full border border-rule bg-raised px-3 py-2 text-sm tracking-[0.08em] text-ink placeholder:font-sans placeholder:tracking-normal placeholder:text-faint focus:border-ink/40 focus:outline-none"
      />

      <div className="mt-2 flex items-center gap-3">
        <div className="flex flex-1 gap-[3px]" aria-hidden="true">
          {Array.from({ length: 21 }, (_, i) => (
            <span
              key={i}
              className={cx(
                'h-1.5 flex-1',
                i < length ? (length > 21 ? 'bg-critical' : 'bg-clay') : 'bg-rule',
              )}
            />
          ))}
        </div>
        <p className="num shrink-0 text-2xs text-muted" aria-live="polite">
          {length} / 21
        </p>
      </div>

      {touched && (
        <p className={cx('mt-2 text-sm', ok ? 'text-good' : 'text-critical')}>
          {ok
            ? 'Right length. Check it character by character against the advert before you submit.'
            : length > 21
              ? `That is ${length} characters — ${length - 21} too many. Letters and digits count; spaces and dashes do not.`
              : `${21 - length} character${21 - length === 1 ? '' : 's'} short.`}
        </p>
      )}

      <p className="mt-4 border-t border-rule pt-3 text-sm leading-relaxed text-muted">
        No code on the advert, or none you can read? The district office can look the parcel up from
        the farm name, portion number and municipality — ask before the closing date, not after.
      </p>
    </div>
  );
}
