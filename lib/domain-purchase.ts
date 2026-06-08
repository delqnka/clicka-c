import { sql } from '@/lib/db';
import {
  buildRequestedDomain,
  DOMAIN_PURCHASE_CURRENCY,
  DOMAIN_SETUP_FEE_CENTS,
  DOMAIN_TLD_OPTIONS,
  formatDomainPurchaseStatus,
  getDomainPurchasePricing,
  getDomainTldPricing,
  normalizeRequestedDomainLabel,
  type DomainPurchaseRequest,
  type DomainPurchaseStatus,
} from '@/lib/domain-purchase-shared';

export {
  buildRequestedDomain,
  DOMAIN_PURCHASE_CURRENCY,
  DOMAIN_SETUP_FEE_CENTS,
  DOMAIN_TLD_OPTIONS,
  formatDomainPurchaseStatus,
  getDomainPurchasePricing,
  getDomainTldPricing,
  normalizeRequestedDomainLabel,
};
export type { DomainPurchaseRequest, DomainPurchaseStatus };

let ensureDomainPurchaseSchemaPromise: Promise<void> | null = null;

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
    registrantViber: String(row.registrant_viber ?? ''),
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
          registrant_viber text NOT NULL DEFAULT '',
          address_line1 text NOT NULL,
          city text NOT NULL,
          postal_code text NOT NULL DEFAULT '',
          country_code text NOT NULL DEFAULT 'BG',
          notes text NOT NULL DEFAULT '',
          setup_fee_cents integer NOT NULL DEFAULT 0,
          domain_fee_cents integer NOT NULL DEFAULT 0,
          total_fee_cents integer NOT NULL DEFAULT 0,
          currency text NOT NULL DEFAULT 'eur',
          status text NOT NULL DEFAULT 'requested',
          stripe_session_id text NOT NULL DEFAULT '',
          stripe_customer_id text NOT NULL DEFAULT '',
          paid_at timestamptz NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        ALTER TABLE domain_purchase_requests
        ADD COLUMN IF NOT EXISTS registrant_viber text NOT NULL DEFAULT ''
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

