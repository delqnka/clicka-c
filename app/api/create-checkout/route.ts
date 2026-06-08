import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@/lib/db';
import { normalizeEmail } from '@/lib/admin-auth';

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
  solo_12m: { amount: 100,   plan: 'solo', billingPeriod: '12m', name: 'Solo сайт — 12 месеца' }, // TEST: временно 1 EUR (оригинал: 29900)
  solo_6m:  { amount: 16900, plan: 'solo', billingPeriod: '6m',  name: 'Solo сайт — 6 месеца' },
  team_12m: { amount: 100,   plan: 'team', billingPeriod: '12m', name: 'Team сайт — 12 месеца' }, // TEST: временно 1 EUR (оригинал: 49900)
  team_6m:  { amount: 27900, plan: 'team', billingPeriod: '6m',  name: 'Team сайт — 6 месеца' },
};

interface BillingInfo {
  companyName: string;
  eik: string;
  vatNumber: string | null;
}

export async function POST(request: NextRequest) {
  let body: { planKey: string; ownerName?: string; email?: string; salonName?: string; slug?: string; smsAddon?: boolean; billingInfo?: BillingInfo };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const { planKey, ownerName, email, salonName, slug, smsAddon, billingInfo } = body;
  const option = PLAN_OPTIONS[planKey];

  if (!option) {
    return NextResponse.json({ error: 'Невалиден план' }, { status: 400 });
  }

  const emailNorm = normalizeEmail(email ?? '');
  if (!emailNorm) {
    return NextResponse.json({ error: 'Въведи валиден имейл' }, { status: 400 });
  }

  const existingOwner = await sql`SELECT id FROM site_owners WHERE email_norm = ${emailNorm} LIMIT 1`;
  if (existingOwner.length > 0) {
    return NextResponse.json(
      { error: 'Вече има акаунт с този имейл. Влез от страницата за вход, вместо да купуваш нов план.' },
      { status: 409 },
    );
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    console.log(`[create-checkout] ▶ Checkout started — planKey=${planKey} plan=${option.plan} period=${option.billingPeriod} amount=${option.amount} smsAddon=${smsAddon ?? false}`);

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      currency: 'eur',
      customer_email: emailNorm,
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
        ownerName: (ownerName ?? '').slice(0, 64),
        salonName: (salonName ?? '').slice(0, 64),
        salonSlug: (slug ?? '').slice(0, 32),
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

    console.log(`[create-checkout] ✅ Checkout session created — id=${session.id}`);

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('[create-checkout] ❌ Failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при създаване на checkout' },
      { status: 500 },
    );
  }
}
