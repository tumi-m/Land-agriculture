import { NextResponse } from 'next/server';
import { loadDataset } from '@/lib/source';

export const dynamic = 'force-dynamic';

/**
 * Polled by the client to pick up changes without a reload.
 *
 * The response carries a weak ETag over the dataset revision, so an unchanged
 * feed costs a 304 and no payload.
 */
export async function GET(request: Request) {
  const dataset = await loadDataset();
  const etag = `W/"${dataset.revision}:${dataset.updatedAt}:${dataset.listings.length}"`;

  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { etag, 'cache-control': 'no-store' },
    });
  }

  return NextResponse.json(dataset, {
    headers: { etag, 'cache-control': 'no-store' },
  });
}
