import { NextRequest, NextResponse } from 'next/server';
import { isPlatformAdminRequest } from '@/lib/platform-admin-auth';
import { sql } from '@/lib/db';
import { generateAdminMagicLink, getActiveCustomDomain } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { salonId } = body as { salonId?: string };

  if (!salonId) {
    return NextResponse.json({ error: 'Липсва salonId' }, { status: 400 });
  }

  const rows = await sql`
    SELECT CAST(id AS text) AS salon_id, slug, email
    FROM salons
    WHERE CAST(id AS text) = ${salonId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Салонът не е намерен' }, { status: 404 });
  }

  const salon = rows[0] as Record<string, unknown>;
  const slug = String(salon.slug ?? '');
  const email = String(salon.email ?? '');

  const customDomain = await getActiveCustomDomain(salonId);
  const magicLink = await generateAdminMagicLink({
    salonId,
    slug,
    email,
    customDomain,
    expiresMs: 2 * 60 * 60 * 1000, // 2 hours
  });

  return NextResponse.json({ magicLink, slug });
}
