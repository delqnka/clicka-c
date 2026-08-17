import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug } from '@/lib/admin-site';
import { resolveSalonLocale } from '@/lib/salon-locale';
import {
  normalizeSalonFaqItems,
  normalizeSalonVisitorInfo,
  normalizeVisitorAdditionalInfo,
} from '@/lib/salon-visitor-info';
import {
  mergeLegacyVisitorIntoVenueExtras,
  parseSalonVenueExtras,
  serializeSalonVenueExtras,
  type SalonVenueExtras,
} from '@/lib/salon-venue-extras';
import { deferRevalidateSalonPublicCache } from '@/lib/defer-revalidate-salon';
import { normalizeSiteContent } from '@/lib/site-content';

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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const next = {
    language: resolveSalonLocale(typeof body.language === 'string' ? body.language : 'bg'),
    name: typeof body.name === 'string' ? body.name.trim() : '',
    category: typeof body.category === 'string' ? body.category.trim() : '',
    phone: typeof body.phone === 'string' ? body.phone.trim() : '',
    city: typeof body.city === 'string' ? body.city.trim() : '',
    address: typeof body.address === 'string' ? body.address.trim() : '',
    about: typeof body.about === 'string' ? body.about.trim() : '',
    aboutEn: typeof body.aboutEn === 'string' ? body.aboutEn.trim() : '',
    heroTitle: typeof body.heroTitle === 'string' ? body.heroTitle.trim() : '',
    heroSubtitle: typeof body.heroSubtitle === 'string' ? body.heroSubtitle.trim() : '',
    heroTitleEn: typeof body.heroTitleEn === 'string' ? body.heroTitleEn.trim() : '',
    heroSubtitleEn: typeof body.heroSubtitleEn === 'string' ? body.heroSubtitleEn.trim() : '',
    instagram: typeof body.instagram === 'string' ? body.instagram.trim() : '',
    facebook: typeof body.facebook === 'string' ? body.facebook.trim() : '',
    tiktok: typeof body.tiktok === 'string' ? body.tiktok.trim() : '',
    googleMapsUrl: typeof body.googleMapsUrl === 'string' ? body.googleMapsUrl.trim() : '',
    googlePlaceId: typeof body.googlePlaceId === 'string' ? body.googlePlaceId.trim() : '',
    latitude:
      body.latitude === null
        ? null
        : typeof body.latitude === 'number' && Number.isFinite(body.latitude)
          ? body.latitude
          : null,
    longitude:
      body.longitude === null
        ? null
        : typeof body.longitude === 'number' && Number.isFinite(body.longitude)
          ? body.longitude
          : null,
    ownerName: typeof body.ownerName === 'string' ? body.ownerName.trim() : '',
    ownerPublicRole: typeof body.ownerPublicRole === 'string' ? body.ownerPublicRole.trim() : '',
    ownerPublicPhotoUrl:
      typeof body.ownerPublicPhotoUrl === 'string' ? body.ownerPublicPhotoUrl.trim() : '',
    ownerPublicBio: typeof body.ownerPublicBio === 'string' ? body.ownerPublicBio.trim() : '',
    faqItems: Array.isArray(body.faqItems) ? normalizeSalonFaqItems(body.faqItems) : [],
    faqItemsEn: Array.isArray(body.faqItemsEn) ? normalizeSalonFaqItems(body.faqItemsEn) : [],
    visitorInfo:
      body.visitorInfo && typeof body.visitorInfo === 'object'
        ? normalizeSalonVisitorInfo(body.visitorInfo)
        : normalizeSalonVisitorInfo(null),
    visitorAdditionalInfo:
      typeof body.visitorAdditionalInfo === 'string'
        ? normalizeVisitorAdditionalInfo(body.visitorAdditionalInfo)
        : '',
    venueExtras:
      body.venueExtras && typeof body.venueExtras === 'object'
        ? serializeSalonVenueExtras(body.venueExtras as SalonVenueExtras)
        : mergeLegacyVisitorIntoVenueExtras(
            parseSalonVenueExtras(null),
            normalizeSalonVisitorInfo(body.visitorInfo),
          ),
    siteContent: normalizeSiteContent(body.siteContent, resolveSalonLocale(typeof body.language === 'string' ? body.language : 'bg')),
    siteContentEn: normalizeSiteContent(body.siteContentEn, 'en'),
  };

  if (!next.name) {
    return NextResponse.json({ error: 'Името на салона е задължително.' }, { status: 400 });
  }
  const defaultAbout =
    next.language === 'en'
      ? `${next.name} accepts online bookings through its own website.`
      : `${next.name} предлага онлайн резервации през собствен сайт.`;
  const defaultAboutEn = `${next.name} accepts online bookings through its own website.`;

  await sql`
    UPDATE salons
    SET
      name = ${next.name},
      language = ${next.language},
      category = ${next.category},
      phone = ${next.phone || ''},
      city = ${next.city || ''},
      address = ${next.address || ''},
      about = ${next.about || defaultAbout},
      about_en = ${next.aboutEn || defaultAboutEn},
      hero_title = ${next.heroTitle || null},
      hero_subtitle = ${next.heroSubtitle || null},
      hero_title_en = ${next.heroTitleEn || null},
      hero_subtitle_en = ${next.heroSubtitleEn || null},
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
      owner_public_bio = ${next.ownerPublicBio || null},
      faq_items = ${JSON.stringify(next.faqItems)}::jsonb,
      faq_items_en = ${JSON.stringify(next.faqItemsEn)}::jsonb,
      visitor_info = ${JSON.stringify(next.visitorInfo)}::jsonb,
      visitor_additional_info = ${next.visitorAdditionalInfo || null},
      venue_extras = ${JSON.stringify(next.venueExtras)}::jsonb,
      site_content = ${JSON.stringify(next.siteContent)}::jsonb,
      site_content_en = ${JSON.stringify(next.siteContentEn)}::jsonb,
      updated_at = now()
    WHERE slug = ${auth.salon.slug}
  `;

  deferRevalidateSalonPublicCache({
    slug: auth.salon.slug,
    customDomain: auth.salon.customDomain,
  });

  return NextResponse.json({
    success: true,
    site: {
      name: next.name,
      language: next.language,
      category: next.category,
      phone: next.phone,
      city: next.city,
      address: next.address,
      about: next.about || defaultAbout,
      aboutEn: next.aboutEn || defaultAboutEn,
      heroTitle: next.heroTitle,
      heroSubtitle: next.heroSubtitle,
      heroTitleEn: next.heroTitleEn,
      heroSubtitleEn: next.heroSubtitleEn,
      instagram: next.instagram,
      facebook: next.facebook,
      tiktok: next.tiktok,
      googleMapsUrl: next.googleMapsUrl,
      googlePlaceId: next.googlePlaceId,
      latitude: next.latitude,
      longitude: next.longitude,
      ownerName: next.ownerName,
      ownerPublicRole: next.ownerPublicRole,
      ownerPublicPhotoUrl: next.ownerPublicPhotoUrl,
      ownerPublicBio: next.ownerPublicBio,
      faqItems: next.faqItems,
      faqItemsEn: next.faqItemsEn,
      visitorInfo: next.visitorInfo,
      visitorAdditionalInfo: next.visitorAdditionalInfo,
      venueExtras: next.venueExtras,
      siteContent: next.siteContent,
      siteContentEn: next.siteContentEn,
    },
  });
}
