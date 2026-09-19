import { PROVINCE_ORDER } from '@/content/provinces';
import type {
  Contact,
  Dataset,
  Enterprise,
  Listing,
  ListingImage,
  ListingStatus,
  ProvinceCode,
  Tenure,
} from './types';

/** Cache tag the revalidation webhook clears. */
export const LAND_DATA_TAG = 'land-data';

/** Seconds before a cached read of the remote feed is considered stale. */
export const REVALIDATE_SECONDS = 60;

/** A feed that has not answered in this long is treated as unavailable. */
export const FEED_TIMEOUT_MS = 10_000;

/** Bytes read from a feed before the read is abandoned. */
export const FEED_MAX_BYTES = 2_000_000;

/** Records accepted from one response. A larger feed needs pagination. */
export const FEED_MAX_LISTINGS = 500;

/**
 * There is no bundled dataset.
 *
 * Every listing this app shows comes from LAND_DATA_URL. Without a feed the
 * page says so and points people at the department — it does not invent an
 * advert, and there is no sample data in the repository to leak into production.
 */
const EMPTY: Omit<Dataset, 'source'> = {
  revision: 'no-feed',
  updatedAt: '1970-01-01T00:00:00.000Z',
  listings: [],
  rejected: 0,
};

const STATUSES: ListingStatus[] = [
  'open',
  'closing-soon',
  'assessment',
  'allocated',
  'unknown',
];

const TENURES: Tenure[] = [
  'lease-30yr',
  'caretaker',
  'lease-10yr',
  'grant',
  'unknown',
];

const ENTERPRISES: Enterprise[] = [
  'poultry',
  'livestock',
  'grain',
  'horticulture',
  'aquaculture',
  'piggery',
  'dairy',
  'forestry',
];

const IMAGE_VARIANTS: NonNullable<ListingImage['variant']>[] = [
  'contour',
  'strips',
  'water',
  'sheds',
  'aerial',
];

/** Trims a value to a bounded string. Anything else reads as not stated. */
function text(value: unknown, max = 400): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** A bounded list of non-empty strings. Anything else is dropped. */
function textList(value: unknown, max = 40, each = 400): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    const line = text(entry, each);
    if (line) out.push(line);
    if (out.length === max) break;
  }
  return out;
}

/** A finite number at or above zero, or null when the feed did not state one. */
function amount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

/** An ISO date string the runtime can actually parse, or '' for unknown. */
function isoDate(value: unknown): string {
  const raw = text(value, 40);
  return raw && !Number.isNaN(Date.parse(raw)) ? raw : '';
}

/**
 * Only http(s) links are kept. A feed is untrusted input, and these values
 * reach href and src attributes, so javascript:, data: and file: are dropped.
 */
function webUrl(value: unknown): string {
  const raw = text(value, 2000);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? parsed.toString()
      : '';
  } catch {
    return '';
  }
}

function isProvince(value: unknown): value is ProvinceCode {
  return typeof value === 'string' && (PROVINCE_ORDER as string[]).includes(value);
}

/** The national extent. A point outside it is a mistake, not a farm. */
function inSouthAfrica(lng: unknown, lat: unknown): boolean {
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= 16 &&
    lng <= 33.1 &&
    lat >= -35.5 &&
    lat <= -21.9
  );
}

function contactOf(value: unknown): Contact {
  const record = (typeof value === 'object' && value !== null ? value : {}) as Record<
    string,
    unknown
  >;
  return {
    office: text(record.office, 200),
    person: text(record.person, 120),
    role: text(record.role, 120),
    phone: text(record.phone, 40),
    email: text(record.email, 200),
    address: text(record.address, 300),
    hours: text(record.hours, 120),
  };
}

function stepsOf(value: unknown): Listing['applicationSteps'] {
  if (!Array.isArray(value)) return [];
  const steps: Listing['applicationSteps'] = [];
  for (const entry of value.slice(0, 20)) {
    const record = (typeof entry === 'object' && entry !== null ? entry : {}) as Record<
      string,
      unknown
    >;
    const title = text(record.title, 200);
    if (!title) continue;
    steps.push({
      title,
      detail: text(record.detail, 1000),
      documents: textList(record.documents, 20),
    });
  }
  return steps;
}

function documentsOf(value: unknown): Listing['documents'] {
  if (!Array.isArray(value)) return [];
  const documents: Listing['documents'] = [];
  for (const entry of value.slice(0, 20)) {
    const record = (typeof entry === 'object' && entry !== null ? entry : {}) as Record<
      string,
      unknown
    >;
    const url = webUrl(record.url);
    if (!url) continue;
    documents.push({ label: text(record.label, 200) || url, url });
  }
  return documents;
}

function imagesOf(value: unknown): ListingImage[] {
  if (!Array.isArray(value)) return [];
  const images: ListingImage[] = [];
  for (const entry of value.slice(0, 12)) {
    const record = (typeof entry === 'object' && entry !== null ? entry : {}) as Record<
      string,
      unknown
    >;
    const src = webUrl(record.src);
    const variant = IMAGE_VARIANTS.includes(
      record.variant as NonNullable<ListingImage['variant']>,
    )
      ? (record.variant as NonNullable<ListingImage['variant']>)
      : undefined;
    // Without a usable src the viewer draws its labelled plan illustration,
    // which is only honest when the record says what it is showing.
    images.push({
      ...(src ? { src } : {}),
      alt: text(record.alt, 300),
      caption: text(record.caption, 300),
      ...(variant ? { variant } : {}),
    });
  }
  return images;
}

/**
 * Turns one feed record into a listing, or rejects it.
 *
 * The identity, province, location and advertised extent have to be right for
 * the record to mean anything, so a record missing any of them is dropped
 * rather than repaired. Everything else is bounded and defaults to "not
 * stated" — never to a value that would read as a fact.
 */
export function validateListing(value: unknown): Listing | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;

  const id = text(record.id, 120);
  const title = text(record.title, 300);
  const province = record.province;
  const coordinates = record.coordinates;
  const sizeHa = amount(record.sizeHa);

  if (!id || !title || !isProvince(province)) return null;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  if (!inSouthAfrica(coordinates[0], coordinates[1])) return null;
  if (sizeHa === null || sizeHa <= 0) return null;

  const arableHa = amount(record.arableHa);
  const rainfallMm = amount(record.rainfallMm);

  return {
    id,
    reference: text(record.reference, 200),
    title,
    province,
    district: text(record.district, 200),
    municipality: text(record.municipality, 200),
    coordinates: [coordinates[0] as number, coordinates[1] as number],
    sizeHa,
    // Arable hectares cannot exceed the advertised extent; an impossible
    // value is dropped rather than shown as a share of the farm.
    arableHa: arableHa !== null && arableHa <= sizeHa ? arableHa : 0,
    // A lease length is a term of an offer. An unstated one stays unknown
    // rather than defaulting to the longest lease the department grants.
    tenure: TENURES.includes(record.tenure as Tenure)
      ? (record.tenure as Tenure)
      : 'unknown',
    enterprises: Array.isArray(record.enterprises)
      ? (record.enterprises.filter((entry) =>
          ENTERPRISES.includes(entry as Enterprise),
        ) as Enterprise[])
      : [],
    // An unstated status stays unknown. Reading it as open would advertise
    // an application window nobody published.
    status: STATUSES.includes(record.status as ListingStatus)
      ? (record.status as ListingStatus)
      : 'unknown',
    opensOn: isoDate(record.opensOn),
    closesOn: isoDate(record.closesOn),
    summary: text(record.summary, 2000),
    water: text(record.water, 1000),
    soil: text(record.soil, 1000),
    rainfallMm: rainfallMm ?? 0,
    infrastructure: textList(record.infrastructure),
    eligibility: textList(record.eligibility),
    applicationSteps: stepsOf(record.applicationSteps),
    contact: contactOf(record.contact),
    documents: documentsOf(record.documents),
    images: imagesOf(record.images),
    updatedAt: isoDate(record.updatedAt),
    verified: record.verified === true,
    ...(webUrl(record.sourceUrl) ? { sourceUrl: webUrl(record.sourceUrl) } : {}),
  };
}

export interface ParsedFeed {
  revision: string;
  updatedAt: string;
  listings: Listing[];
  /** Records the feed sent that could not be trusted, and were dropped. */
  rejected: number;
}

/**
 * Reads a decoded feed body. Pure: no fetch, no clock beyond the caller's.
 *
 * Duplicate ids keep the first record. Anything past FEED_MAX_LISTINGS is
 * counted as rejected rather than silently truncated.
 */
export function parseFeed(body: unknown, now = Date.now()): ParsedFeed {
  const record = (typeof body === 'object' && body !== null ? body : {}) as Record<
    string,
    unknown
  >;
  const raw = Array.isArray(record.listings) ? record.listings : [];
  const listings: Listing[] = [];
  const seen = new Set<string>();
  let rejected = 0;

  for (const entry of raw) {
    if (listings.length >= FEED_MAX_LISTINGS) {
      rejected += 1;
      continue;
    }
    const listing = validateListing(entry);
    if (!listing || seen.has(listing.id)) {
      rejected += 1;
      continue;
    }
    seen.add(listing.id);
    listings.push(listing);
  }

  return {
    revision: text(record.revision, 200) || String(now),
    updatedAt: isoDate(record.updatedAt) || new Date(now).toISOString(),
    listings,
    rejected,
  };
}

function emptyDataset(sourceError?: string): Dataset {
  return { ...EMPTY, source: 'seed', sourceError };
}

/** Reads the body with a byte cap, so a huge feed cannot exhaust the server. */
async function readBounded(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) {
    const body = await response.text();
    if (body.length > FEED_MAX_BYTES) throw new Error('Feed response too large');
    return JSON.parse(body);
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > FEED_MAX_BYTES) {
      await reader.cancel();
      throw new Error('Feed response too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * Reads the live feed named by LAND_DATA_URL.
 *
 * The feed is any JSON endpoint returning `{ revision, updatedAt, listings[] }` —
 * a CMS, a Sheets-backed function, a Supabase view. Reads are cached under
 * LAND_DATA_TAG so /api/revalidate can flush them the moment the source changes.
 * A feed that is unreachable, slow, oversized or malformed yields an empty
 * dataset carrying the reason, never a fabricated or half-trusted one.
 */
export async function loadDataset(): Promise<Dataset> {
  const url = process.env.LAND_DATA_URL;
  if (!url) return emptyDataset();

  try {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (process.env.LAND_DATA_TOKEN) {
      headers.authorization = `Bearer ${process.env.LAND_DATA_TOKEN}`;
    }

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS, tags: [LAND_DATA_TAG] },
    });
    if (!res.ok) return emptyDataset(`Feed responded ${res.status}`);

    const parsed = parseFeed(await readBounded(res));
    if (parsed.listings.length === 0) {
      return emptyDataset(
        parsed.rejected
          ? `Feed returned ${parsed.rejected} record${parsed.rejected === 1 ? '' : 's'}, none usable`
          : 'Feed returned no usable records',
      );
    }

    return {
      revision: parsed.revision,
      updatedAt: parsed.updatedAt,
      source: 'remote',
      listings: parsed.listings,
      rejected: parsed.rejected,
    };
  } catch (error) {
    const reason =
      error instanceof Error && error.name === 'TimeoutError'
        ? `Feed did not answer within ${FEED_TIMEOUT_MS / 1000} seconds`
        : error instanceof Error
          ? error.message
          : 'Feed unreachable';
    return emptyDataset(reason);
  }
}
