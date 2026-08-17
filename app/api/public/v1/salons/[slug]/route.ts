import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

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

  return NextResponse.json({ salon: rows[0] }, { headers: PUBLIC_CORS });
}
