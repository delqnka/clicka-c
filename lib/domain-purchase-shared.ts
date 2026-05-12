export const DOMAIN_PURCHASE_CURRENCY = 'eur';
export const DOMAIN_SETUP_FEE_CENTS = 3900;

export const DOMAIN_TLD_OPTIONS = [
  { value: 'bg', label: '.bg', feeCents: 4900 },
  { value: 'com', label: '.com', feeCents: 1900 },
  { value: 'eu', label: '.eu', feeCents: 1900 },
] as const;

export type DomainPurchaseStatus =
  | 'requested'
  | 'paid'
  | 'processing'
  | 'purchased'
  | 'connected'
  | 'rejected';

export type DomainPurchaseRequest = {
  id: string;
  salonId: string;
  ownerId: string | null;
  requestedLabel: string;
  tld: string;
  fullDomain: string;
  registrantType: 'individual' | 'company';
  registrantName: string;
  companyName: string;
  companyId: string;
  registrantEmail: string;
  registrantPhone: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  countryCode: string;
  notes: string;
  setupFeeCents: number;
  domainFeeCents: number;
  totalFeeCents: number;
  currency: string;
  status: DomainPurchaseStatus;
  stripeSessionId: string;
  stripeCustomerId: string;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
};

export function getDomainTldPricing(tld: string) {
  const normalized = String(tld).trim().toLowerCase();
  return DOMAIN_TLD_OPTIONS.find(item => item.value === normalized) ?? null;
}

export function normalizeRequestedDomainLabel(value: string) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 40);
}

export function buildRequestedDomain(label: string, tld: string) {
  const normalizedLabel = normalizeRequestedDomainLabel(label);
  const normalizedTld = String(tld).trim().toLowerCase().replace(/^\./, '');
  return normalizedLabel && normalizedTld
    ? `${normalizedLabel}.${normalizedTld}`
    : '';
}

export function getDomainPurchasePricing(tld: string) {
  const config = getDomainTldPricing(tld);
  if (!config) return null;

  return {
    tld: config.value,
    domainFeeCents: config.feeCents,
    setupFeeCents: DOMAIN_SETUP_FEE_CENTS,
    totalFeeCents: config.feeCents + DOMAIN_SETUP_FEE_CENTS,
    currency: DOMAIN_PURCHASE_CURRENCY,
  };
}

export function formatDomainPurchaseStatus(status: DomainPurchaseStatus) {
  switch (status) {
    case 'requested':
      return 'Заявката е създадена';
    case 'paid':
      return 'Платено';
    case 'processing':
      return 'Обработваме';
    case 'purchased':
      return 'Домейнът е купен';
    case 'connected':
      return 'Свързан';
    case 'rejected':
      return 'Нужна е корекция';
    default:
      return status;
  }
}
