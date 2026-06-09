import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Липсва STRIPE_SECRET_KEY');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

const PLAN_PRICES: Record<string, Record<string, number>> = {
  solo: { '12m': 29900, '6m': 16900 },
  team: { '12m': 49900, '6m': 27900 },
};

const PLAN_NAMES: Record<string, Record<string, string>> = {
  solo: { '12m': 'Solo — 12 месеца', '6m': 'Solo — 6 месеца' },
  team: { '12m': 'Team — 12 месеца', '6m': 'Team — 6 месеца' },
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

  const salonId = auth.salon.salonId;
  const slug = auth.salon.slug;

  const rows = await sql`
    SELECT plan, pending_plan, stripe_customer_id
    FROM salons WHERE id = ${salonId}::uuid LIMIT 1
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Салонът не е намерен' }, { status: 404 });
  }

  const salon = rows[0] as Record<string, unknown>;
  // If there's a scheduled downgrade, renew on the pending (lower) plan
  const effectivePlan = String(salon.pending_plan ?? salon.plan ?? 'solo');
  const billingPeriod = body.billingPeriod === '6m' ? '6m' : '12m';

  const amount = PLAN_PRICES[effectivePlan]?.[billingPeriod] ?? PLAN_PRICES.solo['12m'];
  const name = PLAN_NAMES[effectivePlan]?.[billingPeriod] ?? 'Clicka.bg план';

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
          product_data: { name: `Clicka.bg — ${name}` },
        },
      }],
      metadata: {
        flow: 'plan_renew',
        salonSlug: slug,
        planType: effectivePlan,
        billingPeriod,
      },
      success_url: `${appUrl}/admin?plan_renew=success`,
      cancel_url: `${appUrl}/admin?plan_renew=cancelled`,
    };

    const stripeCustomerId = String(salon.stripe_customer_id ?? '').trim();
    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
    } else {
      sessionParams.customer_email = auth.session.ownerEmail ?? undefined;
    }

    const session = await getStripe().checkout.sessions.create(sessionParams);
    return NextResponse.json({ checkoutUrl: session.url, amount, billingPeriod, plan: effectivePlan });
  } catch (err) {
    console.error('[plan-renew] Stripe checkout failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Грешка при създаване на плащане' },
      { status: 500 },
    );
  }
}
