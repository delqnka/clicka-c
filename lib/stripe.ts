import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export type PlanType = 'subdomain' | 'custom_domain';

const PLAN_PRICES: Record<PlanType, number> = {
  subdomain: 9900,
  custom_domain: 19900,
};

const PLAN_NAMES: Record<PlanType, string> = {
  subdomain: 'Поддомейн (mimi.clicka.bg)',
  custom_domain: 'Собствен домейн',
};

export async function createCheckoutSession(
  salonSlug: string,
  templateId: string,
  planType: PlanType,
  amount?: number
): Promise<string> {
  const unitAmount = amount ?? PLAN_PRICES[planType];

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'bgn',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'bgn',
          unit_amount: unitAmount,
          product_data: {
            name: `Clicka.bg – ${PLAN_NAMES[planType]}`,
            description: `Шаблон #${templateId} за ${salonSlug}`,
          },
        },
      },
    ],
    metadata: {
      salonSlug,
      templateId,
      planType,
    },
    success_url: `https://clicka.bg/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://clicka.bg`,
  });

  return session.url!;
}

// ─── Stripe Connect helpers ────────────────────────────────────────────────

export async function createConnectedAccount(email: string): Promise<string> {
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  return account.id;
}

export async function createAccountLink(
  accountId: string,
  salonSlug: string,
): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clicka.bg';
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/admin/stripe-return?slug=${salonSlug}&refresh=1`,
    return_url:  `${appUrl}/admin/stripe-return?slug=${salonSlug}`,
    type: 'account_onboarding',
  });
  return link.url;
}

export type ConnectedAccountStatus = {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export async function getConnectedAccountStatus(
  accountId: string,
): Promise<ConnectedAccountStatus> {
  const account = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled:  account.charges_enabled,
    payoutsEnabled:  account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  };
}

export { stripe };
