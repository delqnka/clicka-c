import { sql } from '@/lib/db';
import { ensureOffersSchema } from '@/lib/ensure-offers-schema';
import {
  buildStaticMapUrl,
  fetchGoogleReviewsForPlace,
  resolveGooglePlaceId,
} from '@/lib/google-place-server';
import { extractHostname, getPlatformSubdomain, isPlatformApexHost } from '@/lib/domain-routing';

type PublicSalonLookup = {
  salonId: string;
  slug: string;
};

async function resolvePublicSalonBySlugOrHost({
  slug,
  host,
}: {
  slug?: string | null;
  host?: string | null;
}): Promise<PublicSalonLookup | null> {
  const safeSlug = String(slug ?? '').trim();
  if (safeSlug) {
    const rows = await sql`
      SELECT CAST(id AS text) AS salon_id, slug
      FROM salons
      WHERE slug = ${safeSlug} AND is_active = true
      LIMIT 1
    `;
    if (rows.length > 0) {
      const row = rows[0] as Record<string, unknown>;
      return {
        salonId: String(row.salon_id ?? ''),
        slug: String(row.slug ?? ''),
      };
    }
    return null;
  }

  const hostname = extractHostname(host);
  const subdomain = getPlatformSubdomain(hostname);
  if (subdomain) {
    return resolvePublicSalonBySlugOrHost({ slug: subdomain });
  }
  if (!hostname || isPlatformApexHost(hostname)) return null;

  const customRows = await sql`
    SELECT CAST(id AS text) AS salon_id, slug
    FROM salons
    WHERE lower(custom_domain) = lower(${hostname}) AND is_active = true
    LIMIT 1
  `;

  if (customRows.length === 0 && hostname.startsWith('www.')) {
    return resolvePublicSalonBySlugOrHost({ host: hostname.slice(4) });
  }
  if (customRows.length === 0) return null;

  const row = customRows[0] as Record<string, unknown>;
  return {
    salonId: String(row.salon_id ?? ''),
    slug: String(row.slug ?? ''),
  };
}

export async function getPublicSalonPageData({
  slug,
  host,
}: {
  slug?: string | null;
  host?: string | null;
}) {
  const salonLookup = await resolvePublicSalonBySlugOrHost({
    slug,
    host,
  });

  if (!salonLookup) return null;

  const rows = await sql`
    SELECT *, legal_info
    FROM salons
    WHERE slug = ${salonLookup.slug} AND is_active = true
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const salon = rows[0] as Record<string, unknown>;
  const salonId = String(salon.id ?? '');

  let offers: unknown[] = [];
  let reviews: unknown[] = [];

  try {
    await ensureOffersSchema();
    offers = await sql`
      SELECT id, title, description, discount, images, is_active, valid_until,
             campaign_valid_from, campaign_valid_until, max_claims, total_claims, duration_min
      FROM salon_offers
      WHERE salon_id = ${salonId}
      ORDER BY created_at DESC
    `;
  } catch {
    offers = [];
  }

  try {
    reviews = await sql`
      SELECT id, client_name, client_email, client_avatar, rating, comment,
             specialist_comment, team_member_name, owner_reply, created_at
      FROM salon_reviews
      WHERE salon_id = ${salonId}
      ORDER BY created_at DESC
    `;
  } catch {
    reviews = [];
  }

  const placeId = await resolveGooglePlaceId({
    explicitPlaceId: typeof salon.google_place_id === 'string' ? salon.google_place_id : '',
    mapsUrl: typeof salon.google_maps_url === 'string' ? salon.google_maps_url : '',
  });
  const googleReviews = placeId
    ? await fetchGoogleReviewsForPlace(placeId, {
        name: typeof salon.name === 'string' ? salon.name : undefined,
        city: typeof salon.city === 'string' ? salon.city : undefined,
      })
    : [];

  const lat = salon.latitude != null ? Number(salon.latitude) : NaN;
  const lng = salon.longitude != null ? Number(salon.longitude) : NaN;
  const staticMapUrl =
    Number.isFinite(lat) && Number.isFinite(lng) ? buildStaticMapUrl(lat, lng) : null;

  return {
    salonSlug: salonLookup.slug,
    salon,
    offers,
    reviews,
    googleReviews,
    staticMapUrl,
  };
}
