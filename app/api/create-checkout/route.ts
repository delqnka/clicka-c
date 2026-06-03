import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Липсва STRIPE_SECRET_KEY');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

type PlanOption = {
  amount: number;       // cents
  plan: string;         // canonical: 'solo' | 'team'
  billingPeriod: string; // '6m' | '12m'
  name: string;
};

const PLAN_OPTIONS: Record<string, PlanOption> = {
  solo_12m: { amount: 29900, plan: 'solo', billingPeriod: '12m', name: 'SOLO — Годишен (12 месеца)' },
  solo_6m:  { amount: 16900, plan: 'solo', billingPeriod: '6m',  name: 'SOLO — 6 месеца' },
  team_12m: { amount: 49900, plan: 'team', billingPeriod: '12m', name: 'TEAM — Годишен (12 месеца)' },
  team_6m:  { amount: 27900, plan: 'team', billingPeriod: '6m',  name: 'TEAM — 6 месеца' },
};

interface BillingInfo {
  companyName: string;
  eik: string;
  vatNumber: string | null;
}

export async function POST(request: NextRequest) {
  let body: { planKey: string; smsAddon?: boolean; billingInfo?: BillingInfo };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const { planKey, smsAddon, billingInfo } = body;
  const option = PLAN_OPTIONS[planKey];

  if (!option) {
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
            unit_amount: option.amount,
            product_data: {
              name: `Clicka.bg — ${option.name}`,
            },
          },
        },
      ],
      billing_address_collection: billingInfo ? 'required' : 'auto',
      metadata: {
        planType: option.plan,
        billingPeriod: option.billingPeriod,
        smsAddon: smsAddon ? '1' : '0',
        ...(billingInfo && {
          invoiceCompanyName: billingInfo.companyName,
          invoiceEik: billingInfo.eik,
          invoiceVat: billingInfo.vatNumber ?? '',
        }),
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
