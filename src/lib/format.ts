/**
 * Formatting is done by hand rather than through Intl on purpose: ICU data
 * differs between the Node build that renders the HTML and the browser that
 * hydrates it, and en-ZA grouping is one of the pairs that disagree.
 */
const GROUP = '\u202f'; // narrow no-break space — the South African separator, tight enough to read as one number

export function group(n: number): string {
  const [whole, fraction] = Math.abs(n).toFixed(0).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP);
  return `${n < 0 ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`;
}

export function plural(n: number, one: string, many: string = `${one}s`): string {
  return n === 1 ? one : many;
}

export function hectares(n: number): string {
  if (n < 100) {
    const rounded = Math.round(n * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }
  return group(Math.round(n));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function daysUntil(iso: string, now: number = Date.now()): number {
  return Math.ceil((Date.parse(iso) - now) / 86_400_000);
}

export function relativeTime(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((now - Date.parse(iso)) / 1000);
  if (seconds < 45) return 'just now';
  if (seconds < 90) return 'a minute ago';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return shortDate(iso);
}

export function closingLabel(iso: string, now: number = Date.now()): string {
  const days = daysUntil(iso, now);
  if (days < 0) return 'Closed';
  if (days === 0) return 'Closes today';
  if (days === 1) return 'Closes tomorrow';
  if (days <= 21) return `${days} days left`;
  return `Closes ${shortDate(iso)}`;
}

export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');
