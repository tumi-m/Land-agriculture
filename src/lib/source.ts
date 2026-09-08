import seed from '@/data/listings.json';
import type { Dataset, Listing } from './types';

/** Cache tag the revalidation webhook clears. */
export const LAND_DATA_TAG = 'land-data';

/** Seconds before a cached read of the remote feed is considered stale. */
export const REVALIDATE_SECONDS = 60;

const SEED = seed as unknown as Omit<Dataset, 'source'>;

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

function seedDataset(sourceError?: string): Dataset {
  return {
    revision: SEED.revision,
    updatedAt: SEED.updatedAt,
    source: 'seed',
    sourceError,
    listings: (SEED.listings as Listing[]).map(normalise),
  };
}

/**
 * Reads the live feed named by LAND_DATA_URL, falling back to the bundled seed.
 *
 * The feed is any JSON endpoint returning `{ revision, updatedAt, listings[] }` —
 * a CMS, a Sheets-backed function, a Supabase view. Reads are cached under
 * LAND_DATA_TAG so /api/revalidate can flush them the moment the source changes.
 */
export async function loadDataset(): Promise<Dataset> {
  const url = process.env.LAND_DATA_URL;
  if (!url) return seedDataset();

  try {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (process.env.LAND_DATA_TOKEN) {
      headers.authorization = `Bearer ${process.env.LAND_DATA_TOKEN}`;
    }

    const res = await fetch(url, {
      headers,
      next: { revalidate: REVALIDATE_SECONDS, tags: [LAND_DATA_TAG] },
    });
    if (!res.ok) return seedDataset(`Feed responded ${res.status}`);

    const body = (await res.json()) as Partial<Dataset>;
    const listings = Array.isArray(body.listings) ? body.listings.filter(isListing) : [];
    if (listings.length === 0) return seedDataset('Feed returned no usable records');

    return {
      revision: typeof body.revision === 'string' ? body.revision : String(Date.now()),
      updatedAt: typeof body.updatedAt === 'string' ? body.updatedAt : new Date().toISOString(),
      source: 'remote',
      listings: listings.map(normalise),
    };
  } catch (error) {
    return seedDataset(error instanceof Error ? error.message : 'Feed unreachable');
  }
}
