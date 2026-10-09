import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { listClassScheduleOverrides } from '@/lib/class-schedule-overrides';

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

/**
 * GET /api/public/v1/salons/:slug
 *
 * Anonymous public salon read for the booking SDK bootstrap.
 *
 * This endpoint must stay keyless for backwards compatibility because the
 * booking button can't open until the provider first hydrates the salon
 * record. Booking mutations remain key-gated on the downstream v1 routes.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const slug = String(params.slug ?? '').trim();
  if (!slug) {
    return NextResponse.json(
      { error: 'Missing salon slug' },
      { status: 400, headers: PUBLIC_CORS },
    );
  }

  const rows = await sql`
    SELECT
      CAST(id AS text) AS id,
      slug, name, category, phone, email,
      city, address, about, about_en,
      hero_title, hero_subtitle, hero_title_en, hero_subtitle_en, faq_items, faq_items_en,
      site_content, site_content_en,
      images,
      instagram_username, facebook_username, tiktok_username, google_maps_url,
      working_hours, opening_hours, services, team,
      template_id, primary_color, primary_color_light,
      language
    FROM salons
    WHERE slug = ${slug} AND is_active = true
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'Salon not found' },
      { status: 404, headers: PUBLIC_CORS },
    );
  }

  const salon = rows[0] as Record<string, unknown>;
  const openingHours = salon.opening_hours && typeof salon.opening_hours === 'object'
    ? { ...(salon.opening_hours as Record<string, unknown>) }
    : {};
  const today = new Date();
  const from = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const horizon = new Date(today);
  const advanceDays = Number(openingHours.booking_advance_days);
  horizon.setDate(today.getDate() + (Number.isFinite(advanceDays) && advanceDays >= 1 ? Math.round(advanceDays) : 60));
  const to = `${horizon.getFullYear()}-${String(horizon.getMonth() + 1).padStart(2, '0')}-${String(horizon.getDate()).padStart(2, '0')}`;
  openingHours.class_schedule_overrides = await listClassScheduleOverrides(String(salon.id ?? ''), from, to).catch(() => []);

  return NextResponse.json({ salon: { ...salon, opening_hours: openingHours } }, { headers: PUBLIC_CORS });
}
