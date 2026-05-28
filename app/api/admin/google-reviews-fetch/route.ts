import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug } from '@/lib/admin-site';
import { probeGoogleReviewsForPlace, resolveGooglePlaceId } from '@/lib/google-place-server';
import { ensureGoogleReviewsSchema } from '@/lib/ensure-google-reviews-schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site) {
    return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });
  }

  const placeId = await resolveGooglePlaceId({
    explicitPlaceId: site.googlePlaceId,
    mapsUrl: site.googleMapsUrl,
  });

  if (!placeId) {
    return NextResponse.json({
      success: false,
      reason: 'missing_place_id',
      message: 'Добави Google Place ID или Maps линк в раздел „Сайт".',
      reviews: [],
    });
  }

  const probe = await probeGoogleReviewsForPlace(placeId);

  await ensureGoogleReviewsSchema();

  if (probe.reviews.length > 0) {
    await sql`
      UPDATE salons
      SET
        google_reviews_cache = ${JSON.stringify(probe.reviews)}::jsonb,
        google_reviews_fetched_at = now(),
        updated_at = now()
      WHERE slug = ${auth.salon.slug}
    `;

    return NextResponse.json({
      success: true,
      count: probe.reviews.length,
      reviews: probe.reviews,
      source: probe.source,
      providerStatus: probe.providerStatus ?? null,
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
    reviews: [],
  });
}
