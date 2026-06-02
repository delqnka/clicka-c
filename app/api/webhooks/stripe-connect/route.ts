import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

// Must use raw body for Stripe signature verification
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error('[stripe-connect webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as {
      id: string;
      charges_enabled: boolean;
      payouts_enabled: boolean;
      details_submitted: boolean;
    };
    await sql`
      UPDATE salons SET
        stripe_charges_enabled   = ${account.charges_enabled},
        stripe_payouts_enabled   = ${account.payouts_enabled},
        stripe_details_submitted = ${account.details_submitted},
        stripe_onboarding_complete = ${account.charges_enabled && account.details_submitted}
      WHERE stripe_account_id = ${account.id}
    `;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      id: string;
      amount_total: number | null;
      metadata?: Record<string, string> | null;
      payment_status: string;
    };
    if (session.payment_status === 'paid') {
      const bookingId = session.metadata?.bookingId;
      if (bookingId) {
        await sql`
          UPDATE bookings SET
            status         = 'confirmed',
            payment_status = 'paid',
            amount_paid    = ${session.amount_total ?? 0}
          WHERE id = ${bookingId}
            AND payment_status != 'paid'
        `;
      }
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as {
      metadata?: Record<string, string> | null;
    };
    const bookingId = session.metadata?.bookingId;
    if (bookingId) {
      await sql`
        UPDATE bookings SET
          status         = 'cancelled',
          payment_status = 'failed'
        WHERE id = ${bookingId}
          AND payment_status = 'pending'
      `;
    }
  }

  return NextResponse.json({ received: true });
}
