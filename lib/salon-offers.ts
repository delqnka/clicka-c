import { offerEffectiveForClient } from '@/lib/offer-validity';

export type SalonOfferRow = {
  id: string;
  title: string;
  description?: string | null;
  discount?: number | null;
  images?: unknown;
  is_active?: boolean;
  valid_until?: string | null;
  campaign_valid_from?: string | null;
  campaign_valid_until?: string | null;
  max_claims?: number | null;
  total_claims?: number | null;
  duration_min?: number | null;
};

export type AdminSalonOffer = {
  id: string;
  title: string;
  description: string;
  discount: number | null;
  images: string[];
  isActive: boolean;
  validUntil: string | null;
  campaignValidFrom: string | null;
  campaignValidUntil: string | null;
  maxClaims: number | null;
  totalClaims: number;
  durationMin: number;
};

export function normalizeOfferImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim());
}

export function offerSpotsLeft(offer: {
  max_claims?: number | null;
  maxClaims?: number | null;
  total_claims?: number | null;
  totalClaims?: number | null;
}): number | null {
  const max = offer.maxClaims ?? offer.max_claims;
  if (max == null || !Number.isFinite(Number(max))) return null;
  const used = Number(offer.totalClaims ?? offer.total_claims ?? 0) || 0;
  return Math.max(0, Number(max) - used);
}

export function offerHasSpotsLeft(offer: Parameters<typeof offerSpotsLeft>[0]): boolean {
  const left = offerSpotsLeft(offer);
  return left === null || left > 0;
}

export function offerVisibleToClient(offer: SalonOfferRow, now = Date.now()): boolean {
  return offerEffectiveForClient(offer, now) && offerHasSpotsLeft(offer);
}

export function mapDbOfferRow(row: Record<string, unknown>): AdminSalonOffer {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? '').trim(),
    description: String(row.description ?? '').trim(),
    discount: row.discount != null ? Number(row.discount) : null,
    images: normalizeOfferImages(row.images),
    isActive: row.is_active === true,
    validUntil: row.valid_until ? String(row.valid_until) : null,
    campaignValidFrom: row.campaign_valid_from ? String(row.campaign_valid_from) : null,
    campaignValidUntil: row.campaign_valid_until ? String(row.campaign_valid_until) : null,
    maxClaims: row.max_claims != null ? Number(row.max_claims) : null,
    totalClaims: Number(row.total_claims ?? 0) || 0,
    durationMin: Math.max(15, Number(row.duration_min ?? 60) || 60),
  };
}

export function mapAdminOfferToDb(offer: AdminSalonOffer, salonId: string) {
  return {
    id: offer.id || undefined,
    salon_id: salonId,
    title: offer.title.trim(),
    description: offer.description.trim() || null,
    discount: offer.discount != null && Number.isFinite(offer.discount) ? offer.discount : null,
    images: JSON.stringify(normalizeOfferImages(offer.images)),
    is_active: offer.isActive,
    valid_until: offer.validUntil || null,
    campaign_valid_from: offer.campaignValidFrom || null,
    campaign_valid_until: offer.campaignValidUntil || null,
    max_claims: offer.maxClaims != null && offer.maxClaims > 0 ? Math.round(offer.maxClaims) : null,
    duration_min: Math.max(15, Math.round(offer.durationMin || 60)),
  };
}

export function newEmptyOffer(): AdminSalonOffer {
  return {
    id: '',
    title: '',
    description: '',
    discount: null,
    images: [],
    isActive: true,
    validUntil: null,
    campaignValidFrom: null,
    campaignValidUntil: null,
    maxClaims: null,
    totalClaims: 0,
    durationMin: 60,
  };
}
