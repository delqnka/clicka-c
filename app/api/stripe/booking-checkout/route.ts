import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    bookingId?: string;
    salonSlug?: string;
    serviceName?: string;
    amountEuros?: number;   // full price or deposit in euros
    paymentType?: 'deposit' | 'full';
  };

  const { bookingId, salonSlug, serviceName, amountEuros, paymentType } = body;

  if (!bookingId || !salonSlug || !amountEuros || amountEuros <= 0) {
    return NextResponse.json({ error: 'Невалидни параметри' }, { status: 400 });
  }

  // Load salon stripe_account_id
  const rows = await sql`
    SELECT stripe_account_id, stripe_charges_enabled
    FROM salons WHERE slug = ${salonSlug} LIMIT 1
  `;
  const salon = rows[0] as { stripe_account_id: string | null; stripe_charges_enabled: boolean } | undefined;

  if (!salon?.stripe_account_id || !salon.stripe_charges_enabled) {
    return NextResponse.json({ error: 'Салонът не приема онлайн плащания в момента.' }, { status: 400 });
  }

  const host = request.headers.get('host') ?? '';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const origin = `${proto}://${host}`;

  const amountCents = Math.round(amountEuros * 100);
  const label = paymentType === 'deposit' ? `Депозит — ${serviceName}` : serviceName ?? 'Услуга';

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: amountCents,
            product_data: { name: label },
          },
        },
      ],
      payment_intent_data: {
        metadata: { bookingId, salonSlug, paymentType: paymentType ?? 'full' },
      },
      metadata: {
        bookingId,
        salonSlug,
        paymentType: paymentType ?? 'full',
      },
      success_url: `${origin}/booking/success?booking_id=${bookingId}&return=${encodeURIComponent(origin)}`,
      cancel_url:  `${origin}/booking/cancel?booking_id=${bookingId}&return=${encodeURIComponent(origin)}`,
    },
    {
      // Make the checkout session on behalf of the connected account
      stripeAccount: salon.stripe_account_id,
    }
  );

  // Save checkout session id + set payment_status = pending
  await sql`
    UPDATE bookings
    SET stripe_checkout_session_id = ${session.id},
        payment_status = 'pending'
    WHERE id = ${bookingId}
  `;

  return NextResponse.json({ checkoutUrl: session.url });
}
