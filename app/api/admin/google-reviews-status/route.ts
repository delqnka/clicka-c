import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug } from '@/lib/admin-site';
import { resolveGooglePlaceId } from '@/lib/google-place-server';
import { sql } from '@/lib/db';
import { ensureGoogleReviewsSchema } from '@/lib/ensure-google-reviews-schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site) {
    return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });
  }

  const draftPlaceId = request.nextUrl.searchParams.get('placeId');
  const draftMapsUrl = request.nextUrl.searchParams.get('mapsUrl');
  const placeId = await resolveGooglePlaceId({
    explicitPlaceId: draftPlaceId ?? site.googlePlaceId,
    mapsUrl: draftMapsUrl ?? site.googleMapsUrl,
  });

  await ensureGoogleReviewsSchema().catch(() => {});
  const cacheRows = await sql`
    SELECT google_reviews_cache, google_reviews_count
    FROM salons
    WHERE slug = ${auth.salon.slug}
    LIMIT 1
  `;
  const cacheRaw = cacheRows[0]?.google_reviews_cache;
  const totalGoogleReviews = Number(cacheRows[0]?.google_reviews_count);
  const cachedCount = Array.isArray(cacheRaw) ? cacheRaw.length : 0;
  const hasGoogleConnection =
    (Number.isFinite(totalGoogleReviews) && totalGoogleReviews > 0) || cachedCount > 0;

  if (!placeId) {
    return NextResponse.json({
      connected: false,
      count: cachedCount,
      totalCount: Number.isFinite(totalGoogleReviews) ? totalGoogleReviews : null,
      source: cachedCount > 0 ? 'cache' : 'none',
      reason: 'missing_place_id',
      resolvedPlaceId: null,
    });
  }

  return NextResponse.json(
    {
      connected: hasGoogleConnection,
      count: cachedCount,
      totalCount: Number.isFinite(totalGoogleReviews) ? totalGoogleReviews : null,
      source: cachedCount > 0 ? 'cache' : 'none',
      reason: hasGoogleConnection ? null : 'not_fetched_yet',
      providerStatus: null,
      resolvedPlaceId: placeId,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}

