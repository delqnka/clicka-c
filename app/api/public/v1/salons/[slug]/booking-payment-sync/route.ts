import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { verifyApiKey } from '@/lib/public-api-auth';
import { confirmPaidBookingFromStripeSession } from '@/lib/stripe-booking-confirmation';

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const auth = await verifyApiKey(request, { slug: params.slug, requiredScope: 'book', corsHeaders: PUBLIC_CORS });
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { bookingId?: unknown } | null;
  const bookingId = typeof body?.bookingId === 'string' ? body.bookingId.trim() : '';
  const slug = String(params.slug ?? '').trim();

  if (!bookingId || !slug) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400, headers: PUBLIC_CORS });
  }

  const rows = await sql`
    SELECT b.stripe_checkout_session_id, s.stripe_account_id
    FROM bookings b
    JOIN salons s ON CAST(s.id AS text) = b.salon_id
    WHERE b.id = ${bookingId}
      AND s.slug = ${slug}
    LIMIT 1
  `;
  const row = rows[0] as {
    stripe_checkout_session_id: string | null;
    stripe_account_id: string | null;
  } | undefined;

  if (!row?.stripe_checkout_session_id || !row.stripe_account_id) {
    return NextResponse.json({ ok: false, status: 'not_found' }, { status: 404, headers: PUBLIC_CORS });
  }

  const session = await stripe.checkout.sessions.retrieve(
    row.stripe_checkout_session_id,
    {},
    { stripeAccount: row.stripe_account_id },
  );

  if (session.payment_status !== 'paid') {
    return NextResponse.json(
      { ok: true, status: session.payment_status ?? 'unpaid' },
      { headers: PUBLIC_CORS },
    );
  }

  await confirmPaidBookingFromStripeSession(session, { logLabel: 'booking-payment-sync' });
  return NextResponse.json({ ok: true, status: 'paid' }, { headers: PUBLIC_CORS });
}
