import { sql } from '@/lib/db';
import { buildStaticMapUrl, fetchGoogleReviewsForPlace } from '@/lib/google-place-server';
import SalonPublicParity from '@/app/components/SalonPublicParity';

export const dynamic = 'force-dynamic';

type Search = { [key: string]: string | string[] | undefined };

export default async function SalonSlugPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Search;
}) {
  const salonSlug = params.slug;

  const rows = await sql`
    SELECT *
    FROM salons
    WHERE slug = ${salonSlug} AND is_active = true
  `;

  if (rows.length === 0) {
    return (
      <main style={{ fontFamily: 'system-ui, sans-serif', padding: '60px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Салонът не е намерен</h1>
        <p style={{ color: '#1a1a1a' }}>
          Проверете адреса или се свържете с{' '}
          <a href="https://clicka.bg" style={{ color: '#5B21B6' }}>
            Clicka.bg
          </a>
          .
        </p>
      </main>
    );
  }

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

  const reviewIdRaw = searchParams?.reviewId;
  const highlightReviewId =
    typeof reviewIdRaw === 'string' ? reviewIdRaw.trim() : Array.isArray(reviewIdRaw) ? (reviewIdRaw[0] ?? '').trim() : '';
  const tabRaw = searchParams?.tab;
  const tabParam =
    typeof tabRaw === 'string' ? tabRaw.trim() : Array.isArray(tabRaw) ? (tabRaw[0] ?? '').trim() : '';

  return (
    <SalonPublicParity
      salonSlug={salonSlug}
      salon={salon}
      offers={offers as never}
      reviews={reviews as never}
      googleReviews={googleReviews}
      highlightReviewId={highlightReviewId || null}
      tabParam={tabParam || null}
      staticMapUrl={staticMapUrl}
    />
  );
}
