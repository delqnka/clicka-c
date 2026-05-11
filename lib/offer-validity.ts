/** Клиент вижда оферта според активност и времеви прозорци (като BOOKA уеб). */

export type OfferLike = {
  is_active?: boolean;
  isActive?: boolean;
  valid_until?: string | null;
  validUntil?: string | null;
  campaign_valid_from?: string | null;
  campaignValidFrom?: string | null;
  campaign_valid_until?: string | null;
  campaignValidUntil?: string | null;
};

function isIapOfferWindowOpen(offer: OfferLike, now: number): boolean {
  const until = offer.validUntil ?? offer.valid_until;
  if (!until) return true;
  return new Date(until).getTime() > now;
}

function isWithinOfferCampaign(offer: OfferLike, now: number): boolean {
  const from = offer.campaignValidFrom ?? offer.campaign_valid_from;
  const until = offer.campaignValidUntil ?? offer.campaign_valid_until;
  if (from) {
    if (new Date(from).getTime() > now) return false;
  }
  if (until) {
    if (new Date(until).getTime() < now) return false;
  }
  return true;
}

export function offerEffectiveForClient(offer: OfferLike, now = Date.now()): boolean {
  const active = offer.isActive ?? offer.is_active;
  return !!active && isIapOfferWindowOpen(offer, now) && isWithinOfferCampaign(offer, now);
}
