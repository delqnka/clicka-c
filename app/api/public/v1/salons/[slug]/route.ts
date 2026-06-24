import { NextRequest, NextResponse } from 'next/server';
import { GET as getSalon } from '@/app/api/public/salons/[slug]/route';

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

/**
 * GET /api/public/v1/salons/:slug
 *
 * Anonymous (no API key) public read of the salon record used to hydrate the
 * BookingWidget `salon` prop. Wraps the existing key-gated handler and
 * bypasses the auth check — fields returned are already curated for public
 * consumption (services, working hours, primary color, etc.).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  // The upstream handler reads `params.slug` and gates on `verifyApiKey`.
  // We re-invoke it with a synthetic request that carries a bypass marker
  // through a header the upstream doesn't currently honor — so instead of
  // depending on internal headers, just call the same DB path inline.
  // For now: forward and accept the auth header from the original request.
  // Anonymous callers will get 401 from the upstream.
  //
  // To keep the v1 SDK contract anonymous, we proxy to a key-bypassing branch:
  // attach a header `x-public-v1-internal: 1` and update the upstream to accept
  // it… OR (simpler) re-implement the DB read here without verifyApiKey.
  //
  // Simpler is correct: just inline the SELECT here.
  const { sql } = await import('@/lib/db');
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
      city, address, about,
      images,
      instagram_username, facebook_username, google_maps_url,
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

// Re-export the upstream handler reference so the build keeps the dependency
// graph wired even though we inlined the query above.
void getSalon;
