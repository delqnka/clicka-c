import { NextRequest, NextResponse } from 'next/server';
import { isPlatformAdminRequest } from '@/lib/platform-admin-auth';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const salons = await sql`
    SELECT
      CAST(s.id AS text) AS salon_id,
      s.slug,
      s.name,
      s.email,
      s.is_active,
      s.site_status,
      s.plan_type,
      s.stripe_session_id,
      s.stripe_customer_id,
      s.custom_domain,
      s.domain_status,
      s.created_at,
      s.updated_at,
      o.email AS owner_email,
      COALESCE(b.booking_count, 0) AS booking_count,
      COALESCE(sms.sms_credits, 0) AS sms_credits
    FROM salons s
    LEFT JOIN salon_owner_memberships m ON m.salon_id = CAST(s.id AS text)
    LEFT JOIN site_owners o ON o.id = m.owner_id
    LEFT JOIN (
      SELECT salon_id, COUNT(*) AS booking_count
      FROM bookings
      GROUP BY salon_id
    ) b ON CAST(b.salon_id AS text) = CAST(s.id AS text)
    LEFT JOIN (
      SELECT salon_id, SUM(credits) AS sms_credits
      FROM sms_credits
      GROUP BY salon_id
    ) sms ON CAST(sms.salon_id AS text) = CAST(s.id AS text)
    ORDER BY s.created_at DESC
  `;

  return NextResponse.json({ salons });
}

export async function PATCH(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { salonId, isActive, planType } = body as { salonId?: string; isActive?: boolean; planType?: string | null };

  if (!salonId) {
    return NextResponse.json({ error: 'Липсва salonId' }, { status: 400 });
  }

  if (planType !== undefined) {
    const allowed = ['solo_bonus_12m', 'solo_bonus_6m', 'team_bonus_12m', 'team_bonus_6m', null];
    if (!allowed.includes(planType ?? null)) {
      return NextResponse.json({ error: 'Невалиден план' }, { status: 400 });
    }
    await sql`
      UPDATE salons
      SET plan_type = ${planType ?? null}, updated_at = now()
      WHERE CAST(id AS text) = ${salonId}
    `;
  } else {
    await sql`
      UPDATE salons
      SET is_active = ${isActive ?? false}, updated_at = now()
      WHERE CAST(id AS text) = ${salonId}
    `;
  }

  return NextResponse.json({ ok: true });
}
