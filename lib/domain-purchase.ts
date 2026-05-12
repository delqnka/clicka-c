import { sql } from '@/lib/db';

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

let ensureDomainPurchaseSchemaPromise: Promise<void> | null = null;

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

function mapDomainPurchaseRow(row: Record<string, unknown>): DomainPurchaseRequest {
  return {
    id: String(row.id ?? ''),
    salonId: String(row.salon_id ?? ''),
    ownerId: row.owner_id ? String(row.owner_id) : null,
    requestedLabel: String(row.requested_label ?? ''),
    tld: String(row.tld ?? ''),
    fullDomain: String(row.full_domain ?? ''),
    registrantType:
      String(row.registrant_type ?? 'individual') === 'company' ? 'company' : 'individual',
    registrantName: String(row.registrant_name ?? ''),
    companyName: String(row.company_name ?? ''),
    companyId: String(row.company_id ?? ''),
    registrantEmail: String(row.registrant_email ?? ''),
    registrantPhone: String(row.registrant_phone ?? ''),
    addressLine1: String(row.address_line1 ?? ''),
    city: String(row.city ?? ''),
    postalCode: String(row.postal_code ?? ''),
    countryCode: String(row.country_code ?? 'BG'),
    notes: String(row.notes ?? ''),
    setupFeeCents: Number(row.setup_fee_cents ?? 0),
    domainFeeCents: Number(row.domain_fee_cents ?? 0),
    totalFeeCents: Number(row.total_fee_cents ?? 0),
    currency: String(row.currency ?? DOMAIN_PURCHASE_CURRENCY),
    status: String(row.status ?? 'requested') as DomainPurchaseStatus,
    stripeSessionId: String(row.stripe_session_id ?? ''),
    stripeCustomerId: String(row.stripe_customer_id ?? ''),
    paidAt: String(row.paid_at ?? ''),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export async function ensureDomainPurchaseSchema() {
  if (!ensureDomainPurchaseSchemaPromise) {
    ensureDomainPurchaseSchemaPromise = (async () => {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
      await sql`
        CREATE TABLE IF NOT EXISTS domain_purchase_requests (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          salon_id text NOT NULL,
          owner_id uuid NULL,
          requested_label text NOT NULL,
          tld text NOT NULL,
          full_domain text NOT NULL,
          registrant_type text NOT NULL DEFAULT 'individual',
          registrant_name text NOT NULL,
          company_name text NOT NULL DEFAULT '',
          company_id text NOT NULL DEFAULT '',
          registrant_email text NOT NULL,
          registrant_phone text NOT NULL,
          address_line1 text NOT NULL,
          city text NOT NULL,
          postal_code text NOT NULL DEFAULT '',
          country_code text NOT NULL DEFAULT 'BG',
          notes text NOT NULL DEFAULT '',
          setup_fee_cents integer NOT NULL DEFAULT 0,
          domain_fee_cents integer NOT NULL DEFAULT 0,
          total_fee_cents integer NOT NULL DEFAULT 0,
          currency text NOT NULL DEFAULT ${DOMAIN_PURCHASE_CURRENCY},
          status text NOT NULL DEFAULT 'requested',
          stripe_session_id text NOT NULL DEFAULT '',
          stripe_customer_id text NOT NULL DEFAULT '',
          paid_at timestamptz NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS domain_purchase_requests_salon_id_idx
        ON domain_purchase_requests(salon_id, created_at DESC)
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS domain_purchase_requests_stripe_session_id_uniq
        ON domain_purchase_requests(stripe_session_id)
        WHERE stripe_session_id <> ''
      `;
    })();
  }

  await ensureDomainPurchaseSchemaPromise;
}

export async function loadLatestDomainPurchaseRequest(salonId: string) {
  await ensureDomainPurchaseSchema();
  const rows = await sql`
    SELECT *
    FROM domain_purchase_requests
    WHERE salon_id = ${salonId}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (rows.length === 0) return null;
  return mapDomainPurchaseRow(rows[0] as Record<string, unknown>);
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
