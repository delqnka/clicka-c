import { sql } from '@/lib/db';
import { buildStaticMapUrl, fetchGoogleReviewsForPlace } from '@/lib/google-place-server';
import { resolveSalonBySlugOrHost } from '@/lib/admin-auth';

export async function getPublicSalonPageData({
  slug,
  host,
}: {
  slug?: string | null;
  host?: string | null;
}) {
  const salonLookup = await resolveSalonBySlugOrHost({
    slug,
    host,
    includeInactive: false,
  });

  if (!salonLookup) return null;

  const rows = await sql`
    SELECT *
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
    offers = await sql`
      SELECT id, title, description, discount, images, is_active, valid_until,
             campaign_valid_from, campaign_valid_until, max_claims, total_claims
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

  const placeId = typeof salon.google_place_id === 'string' ? salon.google_place_id.trim() : '';
  const googleReviews = placeId ? await fetchGoogleReviewsForPlace(placeId) : [];

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
