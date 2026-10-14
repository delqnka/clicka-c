import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Revenue is calculated from Stripe-confirmed bookings only. We deliberately
 * use the booking creation timestamp: that is when the Checkout payment is
 * completed, rather than the date of the class itself.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const [summary] = await sql`
    SELECT
      COALESCE(SUM(amount_paid) FILTER (
        WHERE payment_status = 'paid'
          AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Europe/Sofia') AT TIME ZONE 'Europe/Sofia')
      ), 0)::bigint AS paid_today_cents,
      COUNT(*) FILTER (
        WHERE payment_status = 'paid'
          AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Europe/Sofia') AT TIME ZONE 'Europe/Sofia')
      )::int AS paid_today_count,
      COALESCE(SUM(amount_paid) FILTER (
        WHERE payment_status = 'paid'
          AND created_at >= (date_trunc('month', now() AT TIME ZONE 'Europe/Sofia') AT TIME ZONE 'Europe/Sofia')
      ), 0)::bigint AS paid_month_cents,
      COUNT(*) FILTER (
        WHERE payment_status = 'paid'
          AND created_at >= (date_trunc('month', now() AT TIME ZONE 'Europe/Sofia') AT TIME ZONE 'Europe/Sofia')
      )::int AS paid_month_count,
      COUNT(*) FILTER (WHERE payment_status = 'pending')::int AS pending_count,
      COUNT(*) FILTER (WHERE payment_status = 'failed')::int AS failed_count
    FROM bookings
    WHERE salon_id = ${auth.salon.salonId}
  ` as Array<Record<string, unknown>>;

  return NextResponse.json({
    paidTodayCents: Number(summary?.paid_today_cents ?? 0),
    paidTodayCount: Number(summary?.paid_today_count ?? 0),
    paidMonthCents: Number(summary?.paid_month_cents ?? 0),
    paidMonthCount: Number(summary?.paid_month_count ?? 0),
    pendingCount: Number(summary?.pending_count ?? 0),
    failedCount: Number(summary?.failed_count ?? 0),
  });
}
