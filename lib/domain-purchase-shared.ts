export const DOMAIN_PURCHASE_CURRENCY = 'eur';
export const DOMAIN_SETUP_FEE_CENTS = 1999;
export const DOMAIN_SETUP_FEE_BGN_CENTS = 3909;

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
  { value: 'bg',  label: '.bg',  feeCents: 3000, feeBgnCents: 5867 },
  { value: 'org', label: '.org', feeCents:  800, feeBgnCents: 1565 },
  { value: 'info',label: '.info',feeCents:  800, feeBgnCents: 1565 },
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
  registrantViber: string;
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

export type DomainPurchaseFormInput = {
  requestedLabel: string;
  tld: string;
  registrantType: 'individual' | 'company';
  registrantName: string;
  companyName: string;
  companyId: string;
  registrantEmail: string;
  registrantPhone: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  agreedToActOnBehalf: boolean;
  agreedToPolicies: boolean;
};

export type DomainPurchaseFieldKey = keyof DomainPurchaseFormInput;

export function validateDomainPurchaseForm(
  input: DomainPurchaseFormInput,
): Partial<Record<DomainPurchaseFieldKey, string>> {
  const errors: Partial<Record<DomainPurchaseFieldKey, string>> = {};

  if (!String(input.requestedLabel ?? '').trim()) {
    errors.requestedLabel = 'Въведи желано име на домейна.';
  }

  if (!String(input.tld ?? '').trim()) {
    errors.tld = 'Избери разширение на домейна.';
  } else if (!getDomainTldPricing(input.tld)) {
    errors.tld = 'Избери поддържан домейн.';
  }

  if (!String(input.registrantName ?? '').trim()) {
    errors.registrantName = 'Въведи име и фамилия.';
  }

  const email = String(input.registrantEmail ?? '').trim();
  if (!email) {
    errors.registrantEmail = 'Въведи имейл.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.registrantEmail = 'Въведи валиден имейл адрес.';
  }

  if (!String(input.registrantPhone ?? '').trim()) {
    errors.registrantPhone = 'Въведи телефон.';
  }

  if (!String(input.addressLine1 ?? '').trim()) {
    errors.addressLine1 = 'Въведи адрес.';
  }

  if (!String(input.city ?? '').trim()) {
    errors.city = 'Въведи град.';
  }

  if (!String(input.postalCode ?? '').trim()) {
    errors.postalCode = 'Въведи пощенски код.';
  }

  if (input.registrantType === 'company') {
    if (!String(input.companyName ?? '').trim()) {
      errors.companyName = 'Въведи име на фирмата.';
    }
    if (!String(input.companyId ?? '').trim()) {
      errors.companyId = 'Въведи ЕИК.';
    }
  }

  if (!input.agreedToActOnBehalf) {
    errors.agreedToActOnBehalf = 'Потвърди, че домейнът ще бъде регистриран на твое име.';
  }

  if (!input.agreedToPolicies) {
    errors.agreedToPolicies = 'Приеми Общите условия и политиките.';
  }

  return errors;
}

const FIELD_STEP_ORDER: DomainPurchaseFieldKey[] = [
  'requestedLabel',
  'tld',
  'registrantName',
  'registrantEmail',
  'registrantPhone',
  'companyName',
  'companyId',
  'addressLine1',
  'city',
  'postalCode',
  'agreedToActOnBehalf',
  'agreedToPolicies',
];

export function domainPurchaseStepForField(field: DomainPurchaseFieldKey): 1 | 2 | 3 | 4 {
  if (field === 'requestedLabel' || field === 'tld') return 1;
  if (field === 'agreedToActOnBehalf' || field === 'agreedToPolicies') return 4;
  return 3;
}

export function firstDomainPurchaseFieldError(
  errors: Partial<Record<DomainPurchaseFieldKey, string>>,
): DomainPurchaseFieldKey | null {
  for (const key of FIELD_STEP_ORDER) {
    if (errors[key]) return key;
  }
  return null;
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
