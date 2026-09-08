import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { LAND_DATA_TAG } from '@/lib/source';

export const dynamic = 'force-dynamic';

/**
 * Webhook for the publishing side: call it when a listing changes and the next
 * request — and every open browser on its next poll — sees the new data.
 *
 *   curl -X POST https://<host>/api/revalidate -H "x-webhook-secret: $REVALIDATE_SECRET"
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { revalidated: false, error: 'REVALIDATE_SECRET is not configured' },
      { status: 501 },
    );
  }

  const provided =
    request.headers.get('x-webhook-secret') ??
    new URL(request.url).searchParams.get('secret') ??
    '';

  // Constant-time-ish comparison: same length check first, then full scan.
  const ok =
    provided.length === secret.length &&
    provided.split('').reduce((acc, ch, i) => acc + (ch === secret[i] ? 0 : 1), 0) === 0;

  if (!ok) {
    return NextResponse.json({ revalidated: false, error: 'Bad secret' }, { status: 401 });
  }

  revalidateTag(LAND_DATA_TAG);
  revalidatePath('/');

  return NextResponse.json({ revalidated: true, at: new Date().toISOString() });
}
