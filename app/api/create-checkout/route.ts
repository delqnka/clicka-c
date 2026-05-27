import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Липсва STRIPE_SECRET_KEY');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

const PLAN_PRICES: Record<string, number> = {
  solo:   29900,
  ekip:   39900,
  studio: 59900,
};

const PLAN_NAMES: Record<string, string> = {
  solo:   'SOLO — 1 специалист',
  ekip:   'ЕКИП — до 3 специалисти',
  studio: 'СТУДИО — неограничени специалисти',
};

export async function POST(request: NextRequest) {
  let body: { planType: string; smsAddon?: boolean };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const { planType, smsAddon } = body;

  if (!PLAN_PRICES[planType]) {
    return NextResponse.json({ error: 'Невалиден план' }, { status: 400 });
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      currency: 'eur',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: PLAN_PRICES[planType],
            product_data: {
              name: `Clicka.bg — ${PLAN_NAMES[planType]}`,
            },
          },
        },
      ],
      metadata: {
        planType,
        smsAddon: smsAddon ? '1' : '0',
      },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/create`,
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('[create-checkout] failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при създаване на checkout' },
      { status: 500 },
    );
  }
}
