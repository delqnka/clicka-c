import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug } from '@/lib/admin-site';
import { probeGoogleReviewsForPlace, resolveGooglePlaceId } from '@/lib/google-place-server';
import { ensureGoogleReviewsSchema } from '@/lib/ensure-google-reviews-schema';
import { GOOGLE_REVIEWS_CACHE_MAX } from '@/lib/google-reviews-limits';

export const dynamic = 'force-dynamic';
const GOOGLE_REVIEWS_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type ReviewLite = { author_name: string; rating: number; text: string };

function normalizeReviewLite(raw: unknown): ReviewLite | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const author = String(row.author_name ?? '').trim();
  const text = String(row.text ?? '').trim();
  const rating = Number(row.rating);
  if (!author || !text || !Number.isFinite(rating) || rating < 4) return null;
  return {
    author_name: author,
    text,
    rating: Math.min(5, Math.max(1, Math.round(rating))),
  };
}

function reviewLiteKey(r: ReviewLite): string {
  const author = r.author_name.toLowerCase().replace(/\s+/g, ' ').trim();
  const text = r.text.toLowerCase().replace(/\s+/g, ' ').trim();
  return `${author}|${r.rating}|${text}`;
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const forceRefresh = request.nextUrl.searchParams.get('force') === '1';
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let requestPlaceId: string | null = null;
  let requestMapsUrl: string | null = null;
  try {
    const body = (await request.json()) as { placeId?: string; mapsUrl?: string };
    requestPlaceId = String(body?.placeId ?? '').trim() || null;
    requestMapsUrl = String(body?.mapsUrl ?? '').trim() || null;
  } catch {
    requestPlaceId = null;
    requestMapsUrl = null;
  }

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site) {
    return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });
  }

  const placeId = await resolveGooglePlaceId({
    explicitPlaceId: requestPlaceId || site.googlePlaceId,
    mapsUrl: requestMapsUrl || site.googleMapsUrl,
  });

  if (!placeId) {
    return NextResponse.json({
      success: false,
      reason: 'missing_place_id',
      message: 'Добави Google Place ID или Maps линк в раздел „Сайт".',
      reviews: [],
    });
  }

  await ensureGoogleReviewsSchema();
  const cacheRows = await sql`
    SELECT google_reviews_cache, google_reviews_fetched_at, google_reviews_rating, google_reviews_count
    FROM salons
    WHERE slug = ${auth.salon.slug}
    LIMIT 1
  `;
  const cachedRaw = cacheRows[0]?.google_reviews_cache;
  const cachedFetchedAtRaw = cacheRows[0]?.google_reviews_fetched_at;
  const cachedOverallRating = Number(cacheRows[0]?.google_reviews_rating);
  const cachedTotalReviews = Number(cacheRows[0]?.google_reviews_count);
  const cachedReviews = Array.isArray(cachedRaw)
    ? cachedRaw.map(normalizeReviewLite).filter((r): r is ReviewLite => Boolean(r))
    : [];
  const cachedFetchedAt = cachedFetchedAtRaw ? new Date(String(cachedFetchedAtRaw)) : null;
  const cacheIsFresh =
    cachedFetchedAt instanceof Date
    && Number.isFinite(cachedFetchedAt.getTime())
    && Date.now() - cachedFetchedAt.getTime() < GOOGLE_REVIEWS_CACHE_TTL_MS;
  const hasCachedAggregate =
    Number.isFinite(cachedOverallRating) || (Number.isFinite(cachedTotalReviews) && cachedTotalReviews > 0);
  if (!forceRefresh && cacheIsFresh && (cachedReviews.length > 0 || hasCachedAggregate)) {
    return NextResponse.json({
      success: true,
      count: cachedReviews.length,
      reviews: cachedReviews,
      source: 'cache',
      overallRating: Number.isFinite(cachedOverallRating) ? cachedOverallRating : null,
      totalReviews: Number.isFinite(cachedTotalReviews) ? cachedTotalReviews : null,
      providerStatus: null,
      providerHint: 'cached_30_days',
    });
  }

  const probe = await probeGoogleReviewsForPlace(placeId);

  if (
    probe.reviews.length > 0 ||
    Number.isFinite(Number(probe.overallRating)) ||
    (Number.isFinite(Number(probe.totalReviews)) && Number(probe.totalReviews) > 0)
  ) {
    const incomingReviews = probe.reviews
      .map(normalizeReviewLite)
      .filter((r): r is ReviewLite => Boolean(r));
    const existingKeys = new Set(cachedReviews.map(reviewLiteKey));
    const newOnly = incomingReviews.filter((r) => !existingKeys.has(reviewLiteKey(r)));
    const mergedReviews = [...newOnly, ...cachedReviews].slice(0, GOOGLE_REVIEWS_CACHE_MAX);

    await sql`
      UPDATE salons
      SET
        google_reviews_cache = ${JSON.stringify(mergedReviews)}::jsonb,
        google_reviews_rating = ${Number.isFinite(Number(probe.overallRating)) ? Number(probe.overallRating) : null},
        google_reviews_count = ${Number.isFinite(Number(probe.totalReviews)) ? Number(probe.totalReviews) : null},
        google_reviews_fetched_at = now(),
        updated_at = now()
      WHERE slug = ${auth.salon.slug}
    `;

    return NextResponse.json({
      success: true,
      count: mergedReviews.length,
      newCount: newOnly.length,
      reviews: mergedReviews,
      source: probe.source,
      overallRating: Number.isFinite(Number(probe.overallRating)) ? Number(probe.overallRating) : null,
      totalReviews: Number.isFinite(Number(probe.totalReviews)) ? Number(probe.totalReviews) : null,
      providerStatus: probe.providerStatus ?? null,
      providerHint: probe.providerHint ?? null,
    });
  }

  const reasonMessages: Record<string, string> = {
    missing_outscraper_key: 'Липсва OUTSCRAPER_API_KEY. Добави го в Vercel env vars.',
    outscraper_api_error: 'Outscraper API върна грешка. Провери ключа.',
    outscraper_pending: 'Outscraper още обработва заявката. Натисни пак след 5-10 секунди.',
    outscraper_empty: 'Outscraper не намери ревюта. Провери дали Place ID е правилен.',
  };

  return NextResponse.json({
    success: false,
    reason: probe.reason ?? 'unknown',
    message: reasonMessages[probe.reason ?? ''] ?? 'Не успяхме да извлечем ревюта. Опитай отново.',
    providerStatus: probe.providerStatus ?? null,
    providerHint: probe.providerHint ?? null,
    reviews: [],
  });
}
