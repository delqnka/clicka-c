import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyApiKey } from '@/lib/public-api-auth';

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const slug = String(params.slug ?? '').trim();
  if (!slug) {
    return NextResponse.json({ error: 'Missing salon slug' }, { status: 400, headers: PUBLIC_CORS });
  }

  const auth = await verifyApiKey(request, { slug, requiredScope: 'read', corsHeaders: PUBLIC_CORS });
  if (!auth.ok) return auth.response;

  const rows = await sql`
    SELECT
      CAST(id AS text) AS id,
      slug, name, category, phone, email,
      city, address, about,
      site_content,
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
    return NextResponse.json({ error: 'Salon not found' }, { status: 404, headers: PUBLIC_CORS });
  }

  return NextResponse.json({ salon: rows[0] }, { headers: PUBLIC_CORS });
}
