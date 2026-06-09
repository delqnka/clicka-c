import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Липсва STRIPE_SECRET_KEY');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

const TEAM_PRICES: Record<string, number> = { '12m': 49900, '6m': 27900 };
const TEAM_NAMES:  Record<string, string>  = {
  '12m': 'Team — 12 месеца',
  '6m':  'Team — 6 месеца',
};

export async function POST(request: NextRequest) {
  const slugParam =
    request.nextUrl.searchParams.get('slug') ||
    request.headers.get('x-salon-slug') ||
    null;

  const auth = await requireAdminRequestAccess(request, slugParam);
  if (!auth.ok) return auth.response;

  let body: { billingPeriod?: string };
  try { body = await request.json(); } catch { body = {}; }

  const billingPeriod = body.billingPeriod === '6m' ? '6m' : '12m';
  const salonId = auth.salon.salonId;
  const slug = auth.salon.slug;

  const rows = await sql`
    SELECT plan, stripe_customer_id FROM salons WHERE id = ${salonId}::uuid LIMIT 1
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Салонът не е намерен' }, { status: 404 });
  }

  const salon = rows[0] as Record<string, unknown>;
  if (String(salon.plan ?? '') === 'team') {
    return NextResponse.json({ error: 'Вече сте на TEAM план.' }, { status: 400 });
  }

  const amount = TEAM_PRICES[billingPeriod];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      currency: 'eur',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: amount,
          product_data: { name: `Clicka.bg — ${TEAM_NAMES[billingPeriod]}` },
        },
      }],
      metadata: {
        flow: 'plan_upgrade',
        salonSlug: slug,
        planType: 'team',
        billingPeriod,
      },
      success_url: `${appUrl}/admin?plan_upgrade=success`,
      cancel_url: `${appUrl}/admin?plan_upgrade=cancelled`,
    };

    const stripeCustomerId = String(salon.stripe_customer_id ?? '').trim();
    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
    } else {
      sessionParams.customer_email = auth.session.ownerEmail ?? undefined;
    }

    const session = await getStripe().checkout.sessions.create(sessionParams);
    return NextResponse.json({ checkoutUrl: session.url, amount, billingPeriod });
  } catch (err) {
    console.error('[plan-upgrade] Stripe checkout failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Грешка при създаване на плащане' },
      { status: 500 },
    );
  }
}
