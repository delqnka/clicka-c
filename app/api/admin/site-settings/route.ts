import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug } from '@/lib/admin-site';
import {
  normalizeSalonFaqItems,
  normalizeSalonVisitorInfo,
  normalizeVisitorAdditionalInfo,
} from '@/lib/salon-visitor-info';
import { resolveGooglePlaceId, probeGoogleReviewsForPlace } from '@/lib/google-place-server';
import { ensureGoogleReviewsSchema } from '@/lib/ensure-google-reviews-schema';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site) {
    return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });
  }

  return NextResponse.json({ site });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const current = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!current) {
    return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const next = {
    name: typeof body.name === 'string' ? body.name.trim() : current.name,
    category: typeof body.category === 'string' ? body.category.trim() : current.category,
    phone: typeof body.phone === 'string' ? body.phone.trim() : current.phone,
    city: typeof body.city === 'string' ? body.city.trim() : current.city,
    address: typeof body.address === 'string' ? body.address.trim() : current.address,
    about: typeof body.about === 'string' ? body.about.trim() : current.about,
    instagram: typeof body.instagram === 'string' ? body.instagram.trim() : current.instagram,
    facebook: typeof body.facebook === 'string' ? body.facebook.trim() : current.facebook,
    tiktok: typeof body.tiktok === 'string' ? body.tiktok.trim() : current.tiktok,
    googleMapsUrl:
      typeof body.googleMapsUrl === 'string' ? body.googleMapsUrl.trim() : current.googleMapsUrl,
    googlePlaceId:
      typeof body.googlePlaceId === 'string' ? body.googlePlaceId.trim() : current.googlePlaceId,
    latitude:
      body.latitude === null
        ? null
        : typeof body.latitude === 'number' && Number.isFinite(body.latitude)
          ? body.latitude
          : current.latitude,
    longitude:
      body.longitude === null
        ? null
        : typeof body.longitude === 'number' && Number.isFinite(body.longitude)
          ? body.longitude
          : current.longitude,
    ownerName: typeof body.ownerName === 'string' ? body.ownerName.trim() : current.ownerName,
    ownerPublicRole:
      typeof body.ownerPublicRole === 'string'
        ? body.ownerPublicRole.trim()
        : current.ownerPublicRole,
    ownerPublicPhotoUrl:
      typeof body.ownerPublicPhotoUrl === 'string'
        ? body.ownerPublicPhotoUrl.trim()
        : current.ownerPublicPhotoUrl,
    faqItems: Array.isArray(body.faqItems)
      ? normalizeSalonFaqItems(body.faqItems)
      : current.faqItems,
    visitorInfo:
      body.visitorInfo && typeof body.visitorInfo === 'object'
        ? normalizeSalonVisitorInfo(body.visitorInfo)
        : current.visitorInfo,
    visitorAdditionalInfo:
      typeof body.visitorAdditionalInfo === 'string'
        ? normalizeVisitorAdditionalInfo(body.visitorAdditionalInfo)
        : current.visitorAdditionalInfo,
  };

  if (!next.name) {
    return NextResponse.json({ error: 'Името на салона е задължително.' }, { status: 400 });
  }

  await sql`
    UPDATE salons
    SET
      name = ${next.name},
      category = ${next.category || null},
      phone = ${next.phone || null},
      city = ${next.city || null},
      address = ${next.address || ''},
      about = ${next.about || `${next.name} предлага онлайн резервации през собствен сайт.`},
      instagram_username = ${next.instagram || ''},
      facebook_username = ${next.facebook || ''},
      tiktok_username = ${next.tiktok || null},
      google_maps_url = ${next.googleMapsUrl || ''},
      latitude = ${next.latitude},
      longitude = ${next.longitude},
      google_place_id = ${next.googlePlaceId || null},
      owner_name = ${next.ownerName || null},
      owner_public_role = ${next.ownerPublicRole || null},
      owner_public_photo_url = ${next.ownerPublicPhotoUrl || null},
      faq_items = ${JSON.stringify(next.faqItems)}::jsonb,
      visitor_info = ${JSON.stringify(next.visitorInfo)}::jsonb,
      visitor_additional_info = ${next.visitorAdditionalInfo || null},
      updated_at = now()
    WHERE slug = ${auth.salon.slug}
  `;

  let reviewsFetched = 0;
  let reviewsError: string | null = null;
  const placeId = await resolveGooglePlaceId({
    explicitPlaceId: next.googlePlaceId,
    mapsUrl: next.googleMapsUrl,
  });
  if (placeId) {
    try {
      await ensureGoogleReviewsSchema();
      const probe = await probeGoogleReviewsForPlace(placeId);
      if (probe.reviews.length > 0) {
        await sql`
          UPDATE salons
          SET
            google_reviews_cache = ${JSON.stringify(probe.reviews)}::jsonb,
            google_reviews_fetched_at = now()
          WHERE slug = ${auth.salon.slug}
        `;
        reviewsFetched = probe.reviews.length;
      } else {
        reviewsError = probe.reason ?? 'no_reviews';
      }
    } catch {
      reviewsError = 'fetch_error';
    }
  }

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  return NextResponse.json({ success: true, site, reviewsFetched, reviewsError });
}
