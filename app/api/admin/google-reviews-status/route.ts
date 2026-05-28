import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug } from '@/lib/admin-site';
import { probeGoogleReviewsForPlace, resolveGooglePlaceId } from '@/lib/google-place-server';

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

  if (!placeId) {
    return NextResponse.json({
      connected: false,
      count: 0,
      source: 'none',
      reason: 'missing_place_id',
      resolvedPlaceId: null,
    });
  }

  const probe = await probeGoogleReviewsForPlace(placeId, {
    name: site.name || undefined,
    city: site.city || undefined,
  });
  return NextResponse.json(
    {
      connected: probe.reviews.length > 0,
      count: probe.reviews.length,
      source: probe.source,
      reason: probe.reason ?? null,
      resolvedPlaceId: placeId,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}

