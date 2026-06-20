import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ─── Stripe Connect helpers ────────────────────────────────────────────────

export async function createConnectedAccount(
  email: string,
  displayName: string,
): Promise<string> {
  const account = await stripe.accounts.create({
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
  const link = await stripe.accountLinks.create({
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
  const account = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled:  account.charges_enabled,
    payoutsEnabled:  account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  };
}

export { stripe };
