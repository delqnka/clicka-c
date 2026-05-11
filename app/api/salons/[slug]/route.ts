import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  if (!slug) {
    return NextResponse.json(
      { error: 'Липсва идентификатор на салона' },
      { status: 400 }
    );
  }

  const rows = await sql`
    SELECT
      id, slug, name, category, phone, email,
      city, address, about,
      cover_image_url, logo_image_url, gallery_images,
      instagram_username, facebook_username, google_maps_url,
      working_hours, services, team,
      template_id, primary_color, primary_color_light,
      plan_type, custom_domain
    FROM salons
    WHERE slug = ${slug} AND is_active = true
  `;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'Салонът не е намерен' },
      { status: 404 }
    );
  }

  return NextResponse.json(rows[0]);
}
