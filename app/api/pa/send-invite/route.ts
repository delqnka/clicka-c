import { NextRequest, NextResponse } from 'next/server';
import { isPlatformAdminRequest } from '@/lib/platform-admin-auth';
import { sql } from '@/lib/db';
import { normalizeEmail } from '@/lib/admin-auth';
import { sendSiteReadyEmail } from '@/lib/site-ready-email';

export async function POST(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { salonId, email: rawEmail } = body as { salonId?: string; email?: string };

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
  const email = normalizeEmail(typeof rawEmail === 'string' && rawEmail.trim() ? rawEmail : String(salon.email ?? ''));
  if (!email) {
    return NextResponse.json({ error: 'Липсва имейл за клиента' }, { status: 400 });
  }
  if (!email.includes('@') || email.startsWith('@') || email.endsWith('@')) {
    return NextResponse.json({ error: 'Невалиден имейл' }, { status: 400 });
  }

  try {
    await sendSiteReadyEmail({
      salonId,
      slug: String(salon.slug ?? ''),
      email,
      name: String(salon.name ?? ''),
      ownerName: typeof salon.owner_name === 'string' ? salon.owner_name : undefined,
      planType: String(salon.plan_type ?? ''),
    });
  } catch (error) {
    console.error('[pa/send-invite] failed:', error);
    return NextResponse.json(
      { error: 'Не успяхме да генерираме валиден magic link. Не е изпратен имейл.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, email });
}
