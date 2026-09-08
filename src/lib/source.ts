import type { Dataset, Listing } from './types';

/** Cache tag the revalidation webhook clears. */
export const LAND_DATA_TAG = 'land-data';

/** Seconds before a cached read of the remote feed is considered stale. */
export const REVALIDATE_SECONDS = 60;

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
};

function isListing(value: unknown): value is Listing {
  if (typeof value !== 'object' || value === null) return false;
  const l = value as Partial<Listing>;
  return (
    typeof l.id === 'string' &&
    typeof l.title === 'string' &&
    typeof l.province === 'string' &&
    typeof l.sizeHa === 'number' &&
    Array.isArray(l.coordinates) &&
    l.coordinates.length === 2 &&
    typeof l.coordinates[0] === 'number' &&
    typeof l.coordinates[1] === 'number'
  );
}

/** Fills in the optional parts of a record so the UI never has to guard every field. */
function normalise(listing: Listing): Listing {
  return {
    ...listing,
    enterprises: listing.enterprises ?? [],
    infrastructure: listing.infrastructure ?? [],
    eligibility: listing.eligibility ?? [],
    applicationSteps: listing.applicationSteps ?? [],
    documents: listing.documents ?? [],
    images: listing.images ?? [],
    status: listing.status ?? 'open',
    verified: listing.verified ?? false,
  };
}

function emptyDataset(sourceError?: string): Dataset {
  return { ...EMPTY, source: 'seed', sourceError };
}

/**
 * Reads the live feed named by LAND_DATA_URL.
 *
 * The feed is any JSON endpoint returning `{ revision, updatedAt, listings[] }` —
 * a CMS, a Sheets-backed function, a Supabase view. Reads are cached under
 * LAND_DATA_TAG so /api/revalidate can flush them the moment the source changes.
 * With no feed configured, or an unreadable one, the result is empty rather than
 * fabricated.
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
      next: { revalidate: REVALIDATE_SECONDS, tags: [LAND_DATA_TAG] },
    });
    if (!res.ok) return emptyDataset(`Feed responded ${res.status}`);

    const body = (await res.json()) as Partial<Dataset>;
    const listings = Array.isArray(body.listings) ? body.listings.filter(isListing) : [];
    if (listings.length === 0) return emptyDataset('Feed returned no usable records');

    return {
      revision: typeof body.revision === 'string' ? body.revision : String(Date.now()),
      updatedAt: typeof body.updatedAt === 'string' ? body.updatedAt : new Date().toISOString(),
      source: 'remote',
      listings: listings.map(normalise),
    };
  } catch (error) {
    return emptyDataset(error instanceof Error ? error.message : 'Feed unreachable');
  }
}
