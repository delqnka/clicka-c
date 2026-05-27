import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug } from '@/lib/admin-site';
import { probeGoogleReviewsForPlace } from '@/lib/google-place-server';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site) {
    return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });
  }

  const placeId = String(site.googlePlaceId ?? '').trim();
  if (!placeId) {
    return NextResponse.json({
      connected: false,
      count: 0,
      source: 'none',
      reason: 'missing_place_id',
    });
  }

  const probe = await probeGoogleReviewsForPlace(placeId);
  return NextResponse.json({
    connected: probe.reviews.length > 0,
    count: probe.reviews.length,
    source: probe.source,
    reason: probe.reason ?? null,
  });
}

