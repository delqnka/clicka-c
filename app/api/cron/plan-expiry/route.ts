import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get('x-cron-secret') === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Deactivate expired salons and apply any pending downgrade in one query.
    // pending_plan is applied here so it takes effect at expiry even without renewal.
    const result = await sql`
      UPDATE salons
      SET
        is_active = false,
        plan       = COALESCE(pending_plan, plan),
        plan_type  = COALESCE(pending_plan_type, plan_type),
        billing_period = COALESCE(pending_billing_period, billing_period),
        pending_plan = null,
        pending_plan_type = null,
        pending_billing_period = null,
        updated_at = now()
      WHERE is_active = true
        AND plan_expires_at IS NOT NULL
        AND plan_expires_at < now()
      RETURNING slug, plan, billing_period
    `;

    const deactivated = result as unknown as { slug: string; plan: string; billing_period: string }[];

    console.log(`[cron/plan-expiry] Deactivated ${deactivated.length} salon(s):`,
      deactivated.map(r => `${r.slug}(${r.plan})`).join(', ') || 'none');

    return NextResponse.json({ ok: true, deactivated: deactivated.length, salons: deactivated });
  } catch (err) {
    console.error('[cron/plan-expiry]', err);
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
