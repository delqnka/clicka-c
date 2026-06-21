import { NextRequest, NextResponse } from 'next/server';
import { isPlatformAdminRequest } from '@/lib/platform-admin-auth';
import { sql } from '@/lib/db';
import { sendSiteReadyEmail } from '@/lib/site-ready-email';

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
    SELECT
      CAST(id AS text) AS salon_id,
      slug,
      name,
      email,
      owner_name,
      plan_type
    FROM salons
    WHERE CAST(id AS text) = ${salonId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Салонът не е намерен' }, { status: 404 });
  }

  const salon = rows[0] as Record<string, unknown>;
  const email = String(salon.email ?? '').trim();
  if (!email) {
    return NextResponse.json({ error: 'Липсва имейл за клиента' }, { status: 400 });
  }

  await sendSiteReadyEmail({
    salonId,
    slug: String(salon.slug ?? ''),
    email,
    name: String(salon.name ?? ''),
    ownerName: typeof salon.owner_name === 'string' ? salon.owner_name : undefined,
    planType: String(salon.plan_type ?? ''),
  });

  return NextResponse.json({ ok: true });
}
