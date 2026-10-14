import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { confirmPaidBookingFromStripeSession } from '@/lib/stripe-booking-confirmation';

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

  const rows = await sql`
    SELECT b.id, b.stripe_checkout_session_id, s.stripe_account_id
    FROM bookings b
    JOIN salons s ON CAST(s.id AS text) = b.salon_id
    WHERE b.payment_status = 'pending'
      AND b.stripe_checkout_session_id IS NOT NULL
      AND s.stripe_account_id IS NOT NULL
    ORDER BY b.created_at DESC
    LIMIT 50
  ` as unknown as Array<{
    id: string;
    stripe_checkout_session_id: string | null;
    stripe_account_id: string | null;
  }>;

  const checked: string[] = [];
  const paid: string[] = [];
  const errors: Array<{ bookingId: string; message: string }> = [];

  for (const row of rows) {
    if (!row.stripe_checkout_session_id || !row.stripe_account_id) continue;
    checked.push(row.id);
    try {
      const session = await stripe.checkout.sessions.retrieve(
        row.stripe_checkout_session_id,
        {},
        { stripeAccount: row.stripe_account_id },
      );
      if (session.payment_status === 'paid') {
        await confirmPaidBookingFromStripeSession(session, { logLabel: 'stripe-booking-payment-sync' });
        paid.push(row.id);
      }
    } catch (err) {
      errors.push({
        bookingId: row.id,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    checked: checked.length,
    paid: paid.length,
    paidBookingIds: paid,
    errors,
  });
}
