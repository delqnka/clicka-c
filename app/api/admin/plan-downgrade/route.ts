import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const slugParam =
    request.nextUrl.searchParams.get('slug') ||
    request.headers.get('x-salon-slug') ||
    null;

  const auth = await requireAdminRequestAccess(request, slugParam);
  if (!auth.ok) return auth.response;

  let body: { cancel?: boolean };
  try { body = await request.json(); } catch { body = {}; }

  const salonId = auth.salon.salonId;

  const rows = await sql`
    SELECT plan, billing_period, pending_plan FROM salons WHERE id = ${salonId}::uuid LIMIT 1
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Салонът не е намерен' }, { status: 404 });
  }

  const salon = rows[0] as Record<string, unknown>;
  const currentPlan = String(salon.plan ?? 'solo');

  if (currentPlan !== 'team') {
    return NextResponse.json({ error: 'Планът ви вече е Solo.' }, { status: 400 });
  }

  // cancel=true → cancel a previously scheduled downgrade
  if (body.cancel) {
    await sql`
      UPDATE salons
      SET pending_plan = null, pending_plan_type = null, pending_billing_period = null, updated_at = now()
      WHERE id = ${salonId}::uuid
    `;
    return NextResponse.json({ success: true, cancelled: true });
  }

  // Schedule downgrade — takes effect at next renewal
  const billingPeriod = String(salon.billing_period ?? '12m');
  await sql`
    UPDATE salons
    SET
      pending_plan = 'solo',
      pending_plan_type = 'solo',
      pending_billing_period = ${billingPeriod},
      updated_at = now()
    WHERE id = ${salonId}::uuid
  `;

  return NextResponse.json({ success: true, effectiveAt: 'next_renewal' });
}
