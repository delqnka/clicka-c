export const DOMAIN_PURCHASE_CURRENCY = 'eur';
export const DOMAIN_SETUP_FEE_CENTS = 2500;
export const DOMAIN_SETUP_FEE_BGN_CENTS = 4890;

export type DomainTldOption = {
  value: string;
  label: string;
  feeCents: number;
  feeBgnCents: number;
  badge?: string;
  originalFeeCents?: number;
  originalFeeBgnCents?: number;
};

export const DOMAIN_TLD_OPTIONS: DomainTldOption[] = [
  { value: 'com', label: '.com', feeCents: 1200, feeBgnCents: 2347 },
  { value: 'bg', label: '.bg', feeCents: 3000, feeBgnCents: 5867 },
  { value: 'org', label: '.org', feeCents: 800, feeBgnCents: 1565 },
  { value: 'info', label: '.info', feeCents: 800, feeBgnCents: 1565 },
];

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
    domainFeeBgnCents: config.feeBgnCents,
    setupFeeCents: DOMAIN_SETUP_FEE_CENTS,
    setupFeeBgnCents: DOMAIN_SETUP_FEE_BGN_CENTS,
    totalFeeCents: config.feeCents + DOMAIN_SETUP_FEE_CENTS,
    totalFeeBgnCents: config.feeBgnCents + DOMAIN_SETUP_FEE_BGN_CENTS,
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
