import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  if (!slug) {
    return NextResponse.json({ error: 'Липсва идентификатор на салона' }, { status: 400, headers: CORS_HEADERS });
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
      plan_type
    FROM salons
    WHERE slug = ${slug} AND is_active = true
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Салонът не е намерен' }, { status: 404, headers: CORS_HEADERS });
  }

  return NextResponse.json(rows[0], { headers: CORS_HEADERS });
}
