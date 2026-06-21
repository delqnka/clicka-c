import Stripe from 'stripe';

let cached: Stripe | null = null;

function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured for this deployment.');
  }
  cached = new Stripe(key);
  return cached;
}

// ─── Stripe Connect helpers ────────────────────────────────────────────────

export async function createConnectedAccount(
  email: string,
  displayName: string,
): Promise<string> {
  const account = await getStripe().accounts.create({
    type: 'express',
    email,
    business_profile: { name: displayName },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  return account.id;
}

export async function createAccountLink(
  accountId: string,
  returnUrl: string,
): Promise<string> {
  const link = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: returnUrl,
    return_url:  returnUrl,
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
  const account = await getStripe().accounts.retrieve(accountId);
  return {
    chargesEnabled:  account.charges_enabled,
    payoutsEnabled:  account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  };
}

// Lazy proxy: backward-compatible `stripe.accounts.create(...)` style usage
// without evaluating `new Stripe(...)` at module load (which would 404 the
// whole route if STRIPE_SECRET_KEY is missing in this environment).
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});
