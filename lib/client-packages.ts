import { sql } from '@/lib/db';
import { ensureSalonClientsSchema } from '@/lib/ensure-salon-clients-schema';
import { normalizePhoneForMatch, upsertSalonClient } from '@/lib/salon-clients';

export type ClientPackageSummary = {
  id: string;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  expiresAt: string;
  purchasedAt: string;
  price: number | null;
  status: 'active' | 'expired' | 'used';
};

export type ClientPackageUsageSummary = {
  id: string;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  expiresAt: string;
  /** Immutable financial value captured when this credit was used. */
  creditValue?: number | null;
};

type ClientPackageAdjustmentReason = 'initial_balance' | 'manual_correction' | 'legacy_reconciliation';

async function recordClientPackageAdjustment(input: {
  salonId: string;
  packageId: string;
  usedSessionsDelta: number;
  reason: ClientPackageAdjustmentReason;
}) {
  if (!input.usedSessionsDelta) return;
  await sql`
    INSERT INTO client_package_adjustments (salon_id, package_id, used_sessions_delta, reason)
    VALUES (${input.salonId}, ${input.packageId}::uuid, ${input.usedSessionsDelta}, ${input.reason})
  `;
}

/** Finds a usable package without mutating its balance.
 *
 * The contact profile is the identity source of truth. Packages are then
 * resolved with the exact relationship used by the Clients admin panel.
 */
export async function findActiveClientPackage(input: {
  salonId: string;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  /**
   * The id of the service being booked. When provided, a package only pays for
   * the booking if its definition covers that service (its `service_ids`); a
   * definition with no services, or a package with no definition, is
   * unrestricted. When omitted/empty (e.g. the package-status lookup, which has
   * no service context) no service filter is applied. This stops a Reformer
   * package from being spent on a Mat Pilates class.
   */
  serviceId?: string | null;
}): Promise<ClientPackageUsageSummary | null> {
  await ensureClientPackagesSchema();
  const email = input.clientEmail?.trim().toLowerCase() || '';
  const phoneDigits = normalizePhoneForMatch(input.clientPhone);
  if (!email && !phoneDigits) return null;
  const serviceId = input.serviceId?.trim() || '';

  // A phone number is a stronger identifier than email: family members can
  // share an inbox. Only fall back to email when no usable phone was entered.
  const clients = await sql`
    SELECT id, name, phone, email
    FROM salon_clients
    WHERE salon_id = ${input.salonId}
      AND (
        (${phoneDigits} <> '' AND regexp_replace(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), '^(?:00359|359)?0*', '') = ${phoneDigits})
        OR (${phoneDigits} = '' AND ${email} <> '' AND lower(trim(coalesce(email, ''))) = ${email})
      )
    ORDER BY
      CASE
        WHEN ${phoneDigits} <> '' AND regexp_replace(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), '^(?:00359|359)?0*', '') = ${phoneDigits} THEN 0
        WHEN ${phoneDigits} = '' AND ${email} <> '' AND lower(trim(coalesce(email, ''))) = ${email} THEN 1
        ELSE 2
      END,
      updated_at DESC
    LIMIT 1
  ` as { id: string; name: string; phone: string | null; email: string | null }[];
  const client = clients[0];
  if (!client) return null;

  const rows = await sql`
    SELECT cp.id, cp.package_name, cp.total_sessions, cp.used_sessions, cp.expires_at::text AS expires_at
    FROM client_packages cp
    LEFT JOIN client_package_definitions d ON d.id = cp.package_definition_id
    WHERE cp.salon_id = ${input.salonId}
      AND cp.expires_at >= CURRENT_DATE
      AND cp.used_sessions < cp.total_sessions
      AND (
        (${phoneDigits} <> '' AND regexp_replace(regexp_replace(coalesce(cp.client_phone, ''), '\\D', '', 'g'), '^(?:00359|359)?0*', '') = ${phoneDigits})
        OR (${phoneDigits} = '' AND ${email} <> '' AND lower(trim(coalesce(cp.client_email, ''))) = ${email})
      )
      AND (
        -- No service context (e.g. the package-status lookup): keep legacy
        -- behaviour and do not filter by service.
        ${serviceId} = ''
        -- Unrestricted package: no definition, or a definition that covers every service.
        OR cp.package_definition_id IS NULL
        OR d.service_ids IS NULL
        OR jsonb_array_length(COALESCE(d.service_ids, '[]'::jsonb)) = 0
        -- Otherwise the booked service must be one the package covers.
        OR d.service_ids @> to_jsonb(${serviceId}::text)
      )
    ORDER BY cp.expires_at ASC, cp.created_at ASC
    LIMIT 2
  ` as { id: string; package_name: string; total_sessions: number; used_sessions: number; expires_at: string }[];
  // Email-only matching is safe only when it identifies exactly one active
  // package. The booking form then asks for the phone instead of charging a
  // different client who happens to share an inbox.
  if (phoneDigits === '' && rows.length !== 1) return null;
  const row = rows[0];
  if (!row) return null;
  const totalSessions = Math.max(1, Number(row.total_sessions) || 1);
  const usedSessions = Math.min(totalSessions, Math.max(0, Number(row.used_sessions) || 0));
  return {
    id: String(row.id),
    packageName: String(row.package_name ?? ''),
    totalSessions,
    usedSessions,
    remainingSessions: Math.max(0, totalSessions - usedSessions),
    expiresAt: String(row.expires_at ?? ''),
  };
}

/** Finds a still-valid package whose credits are all used up, so the public
 * booking form can tell the client to buy a new one. Only consulted when no
 * active (credit-bearing) package was found. */
export async function findExhaustedClientPackage(input: {
  salonId: string;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
}): Promise<{ packageName: string; totalSessions: number; expiresAt: string } | null> {
  await ensureClientPackagesSchema();
  const email = input.clientEmail?.trim().toLowerCase() || '';
  const phoneDigits = normalizePhoneForMatch(input.clientPhone);
  if (!email && !phoneDigits) return null;

  const rows = await sql`
    SELECT cp.package_name, cp.total_sessions, cp.expires_at::text AS expires_at
    FROM client_packages cp
    WHERE cp.salon_id = ${input.salonId}
      AND cp.expires_at >= CURRENT_DATE
      AND cp.used_sessions >= cp.total_sessions
      AND (
        (${phoneDigits} <> '' AND regexp_replace(regexp_replace(coalesce(cp.client_phone, ''), '\\D', '', 'g'), '^(?:00359|359)?0*', '') = ${phoneDigits})
        OR (${phoneDigits} = '' AND ${email} <> '' AND lower(trim(coalesce(cp.client_email, ''))) = ${email})
      )
    ORDER BY cp.expires_at DESC, cp.created_at DESC
    LIMIT 1
  ` as { package_name: string; total_sessions: number; expires_at: string }[];
  const row = rows[0];
  if (!row) return null;
  return {
    packageName: String(row.package_name ?? ''),
    totalSessions: Math.max(1, Number(row.total_sessions) || 1),
    expiresAt: String(row.expires_at ?? ''),
  };
}

export async function ensureClientPackagesSchema() {
  await ensureSalonClientsSchema();
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await sql`
    CREATE TABLE IF NOT EXISTS client_packages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      salon_id text NOT NULL,
      client_id text,
      client_name text NOT NULL,
      client_phone text,
      client_email text,
      package_name text NOT NULL,
      total_sessions int NOT NULL,
      used_sessions int NOT NULL DEFAULT 0,
      price numeric,
      purchased_at timestamptz NOT NULL DEFAULT now(),
      expires_at date NOT NULL,
      source text NOT NULL DEFAULT 'admin',
      package_definition_id uuid,
      stripe_checkout_session_id text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    ALTER TABLE client_packages
    ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text
  `;
  await sql`
    ALTER TABLE client_packages
    ADD COLUMN IF NOT EXISTS package_definition_id uuid
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS client_packages_stripe_session_uniq
      ON client_packages(stripe_checkout_session_id)
      WHERE stripe_checkout_session_id IS NOT NULL
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS client_packages_salon_client_idx
      ON client_packages(salon_id, client_id, expires_at)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS client_packages_salon_lookup_idx
      ON client_packages(salon_id, lower(client_email), client_phone, lower(client_name), expires_at)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS client_package_usages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      salon_id text NOT NULL,
      package_id uuid NOT NULL REFERENCES client_packages(id) ON DELETE CASCADE,
      booking_id uuid NOT NULL,
      package_name_snapshot text,
      package_price_snapshot numeric,
      package_total_sessions_snapshot integer,
      credit_value_snapshot numeric,
      trainer_payout_rate_snapshot numeric,
      trainer_payout_snapshot numeric,
      used_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (salon_id, booking_id)
    )
  `;
  await sql`
    ALTER TABLE client_package_usages
      ADD COLUMN IF NOT EXISTS package_name_snapshot text,
      ADD COLUMN IF NOT EXISTS package_price_snapshot numeric,
      ADD COLUMN IF NOT EXISTS package_total_sessions_snapshot integer,
      ADD COLUMN IF NOT EXISTS credit_value_snapshot numeric,
      ADD COLUMN IF NOT EXISTS trainer_payout_rate_snapshot numeric,
      ADD COLUMN IF NOT EXISTS trainer_payout_snapshot numeric
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS client_package_adjustments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      salon_id text NOT NULL,
      package_id uuid NOT NULL REFERENCES client_packages(id) ON DELETE CASCADE,
      used_sessions_delta integer NOT NULL CHECK (used_sessions_delta <> 0),
      reason text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS client_package_adjustments_package_idx
      ON client_package_adjustments(package_id, created_at)
  `;
}

export async function createClientPackage(input: {
  salonId: string;
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  totalSessions: 4 | 8 | number;
  usedSessions?: number | null;
  packageName?: string | null;
  price?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  validityDays?: number | null;
  source?: 'admin' | 'online';
  packageDefinitionId?: string | null;
  stripeCheckoutSessionId?: string | null;
}) {
  await ensureClientPackagesSchema();
  const client = await upsertSalonClient(input.salonId, input.clientName, {
    phone: input.clientPhone ?? undefined,
    email: input.clientEmail ?? undefined,
  });
  const totalSessions = Math.max(1, Math.round(Number(input.totalSessions) || 1));
  const usedSessions = Math.min(totalSessions, Math.max(0, Math.round(Number(input.usedSessions ?? 0) || 0)));
  const packageName = input.packageName?.trim() || `${totalSessions} тренировки`;
  const validityDays = Math.max(1, Math.round(Number(input.validityDays ?? 30) || 30));
  const validTo = input.validTo?.trim() || null;
  const rows = await sql`
    INSERT INTO client_packages (
      salon_id, client_id, client_name, client_phone, client_email,
      package_name, total_sessions, used_sessions, price, purchased_at, expires_at,
      source, package_definition_id, stripe_checkout_session_id
    )
    VALUES (
      ${input.salonId},
      ${client.id},
      ${input.clientName.trim()},
      ${input.clientPhone?.trim() || null},
      ${input.clientEmail?.trim().toLowerCase() || null},
      ${packageName},
      ${totalSessions},
      ${usedSessions},
      -- Inherit the catalog price when the caller did not supply one, so a
      -- package created from a definition is never stored price-less.
      COALESCE(
        ${input.price ?? null},
        (SELECT d.price FROM client_package_definitions d WHERE d.id = ${input.packageDefinitionId?.trim() || null}::uuid)
      ),
      COALESCE(${input.validFrom?.trim() || null}::date, now()),
      COALESCE(${validTo}::date, (CURRENT_DATE + (${validityDays}::int * interval '1 day'))::date),
      ${input.source ?? 'admin'},
      ${input.packageDefinitionId?.trim() || null}::uuid,
      ${input.stripeCheckoutSessionId?.trim() || null}
    )
    ON CONFLICT (stripe_checkout_session_id)
    WHERE stripe_checkout_session_id IS NOT NULL
    DO UPDATE SET updated_at = client_packages.updated_at
    RETURNING id, package_name, total_sessions, used_sessions, expires_at, purchased_at, (xmax = 0) AS inserted
  ` as {
    id: string;
    package_name: string;
    total_sessions: number;
    used_sessions: number;
    expires_at: string;
    purchased_at: string;
    inserted: boolean;
  }[];
  const row = rows[0]!;
  const returnedTotalSessions = Math.max(1, Number(row.total_sessions) || totalSessions);
  const returnedUsedSessions = Math.min(returnedTotalSessions, Math.max(0, Number(row.used_sessions) || 0));
  if (row.inserted && returnedUsedSessions > 0) {
    await recordClientPackageAdjustment({
      salonId: input.salonId,
      packageId: String(row.id),
      usedSessionsDelta: returnedUsedSessions,
      reason: 'initial_balance',
    });
  }
  return {
    id: String(row.id),
    packageName: String(row.package_name ?? packageName),
    totalSessions: returnedTotalSessions,
    usedSessions: returnedUsedSessions,
    remainingSessions: Math.max(0, returnedTotalSessions - returnedUsedSessions),
    expiresAt: String(row.expires_at ?? validTo ?? ''),
    purchasedAt: String(row.purchased_at ?? input.validFrom ?? ''),
  };
}

export async function consumePackageForCompletedBooking(input: {
  salonId: string;
  bookingId: string;
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  /** The package selected during checkout. When supplied we must never fall
   * back to another package with a matching client. */
  packageId?: string | null;
}): Promise<ClientPackageUsageSummary | null> {
  await ensureClientPackagesSchema();
  const email = input.clientEmail?.trim().toLowerCase() || '';
  const phoneDigits = normalizePhoneForMatch(input.clientPhone);
  const name = input.clientName.trim();
  const packageId = input.packageId?.trim() || null;

  const rows = await sql`
    WITH pkg AS (
      SELECT cp.id
      FROM client_packages cp
      WHERE cp.salon_id = ${input.salonId}
        AND cp.expires_at >= CURRENT_DATE
        AND cp.used_sessions < cp.total_sessions
        AND NOT EXISTS (
          SELECT 1 FROM client_package_usages u
          WHERE u.salon_id = ${input.salonId}
            AND u.booking_id = ${input.bookingId}::uuid
        )
        AND (
          (${packageId}::uuid IS NOT NULL AND cp.id = ${packageId}::uuid)
          OR (
            ${packageId}::uuid IS NULL
            AND (
              (${email} <> '' AND lower(trim(coalesce(cp.client_email, ''))) = ${email})
              OR (${phoneDigits} <> '' AND regexp_replace(regexp_replace(coalesce(cp.client_phone, ''), '\\D', '', 'g'), '^(?:00359|359)?0*', '') = ${phoneDigits})
              OR lower(trim(cp.client_name)) = lower(trim(${name}))
            )
          )
        )
      ORDER BY cp.expires_at ASC, cp.created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    ),
    upd AS (
      UPDATE client_packages cp
      SET used_sessions = cp.used_sessions + 1,
          updated_at = now()
      FROM pkg
      WHERE cp.id = pkg.id
        AND cp.used_sessions < cp.total_sessions
      RETURNING cp.id, cp.package_name, cp.total_sessions, cp.used_sessions, cp.expires_at,
        COALESCE(cp.price, (SELECT d.price FROM client_package_definitions d WHERE d.id = cp.package_definition_id)) AS price
    ),
    usage AS (
      INSERT INTO client_package_usages (
        salon_id, package_id, booking_id,
        package_name_snapshot, package_price_snapshot, package_total_sessions_snapshot,
        credit_value_snapshot, trainer_payout_rate_snapshot, trainer_payout_snapshot
      )
      SELECT
        ${input.salonId}, upd.id, ${input.bookingId}::uuid,
        upd.package_name, upd.price, upd.total_sessions,
        CASE WHEN upd.price IS NOT NULL AND upd.price >= 0 THEN upd.price / NULLIF(upd.total_sessions, 0) ELSE NULL END,
        0.5,
        CASE WHEN upd.price IS NOT NULL AND upd.price >= 0 THEN (upd.price / NULLIF(upd.total_sessions, 0)) * 0.5 ELSE NULL END
      FROM upd
      ON CONFLICT (salon_id, booking_id) DO NOTHING
      RETURNING package_id, credit_value_snapshot
    )
    SELECT upd.id, upd.package_name, upd.total_sessions, upd.used_sessions, upd.expires_at, usage.credit_value_snapshot
    FROM upd
    INNER JOIN usage ON usage.package_id = upd.id
  ` as {
    id: string;
    package_name: string;
    total_sessions: number;
    used_sessions: number;
    expires_at: string;
    credit_value_snapshot: string | number | null;
  }[];
  const row = rows[0];
  if (!row) return null;
  const totalSessions = Math.max(1, Number(row.total_sessions) || 1);
  const usedSessions = Math.min(totalSessions, Math.max(0, Number(row.used_sessions) || 0));
  return {
    id: String(row.id),
    packageName: String(row.package_name ?? ''),
    totalSessions,
    usedSessions,
    remainingSessions: Math.max(0, totalSessions - usedSessions),
    expiresAt: String(row.expires_at ?? ''),
    creditValue: row.credit_value_snapshot == null ? null : Number(row.credit_value_snapshot),
  };
}

/** Links a booking to a credit that an administrator has already deducted.
 * This deliberately does not change `used_sessions`: it only makes the
 * manual deduction traceable from the booking list. */
export async function linkExistingPackageCreditToBooking(input: {
  salonId: string;
  bookingId: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
}): Promise<ClientPackageUsageSummary | null> {
  await ensureClientPackagesSchema();
  const email = input.clientEmail?.trim().toLowerCase() || '';
  const phoneDigits = normalizePhoneForMatch(input.clientPhone);
  if (!email && !phoneDigits) return null;

  const rows = await sql`
    WITH pkg AS (
      SELECT cp.id
      FROM client_packages cp
      WHERE cp.salon_id = ${input.salonId}
        AND cp.used_sessions > (
          SELECT COUNT(*) FROM client_package_usages u WHERE u.package_id = cp.id
        )
        AND (
          (${email} <> '' AND lower(trim(coalesce(cp.client_email, ''))) = ${email})
          OR (${phoneDigits} <> '' AND regexp_replace(regexp_replace(coalesce(cp.client_phone, ''), '\\D', '', 'g'), '^(?:00359|359)?0*', '') = ${phoneDigits})
        )
        AND NOT EXISTS (
          SELECT 1 FROM client_package_usages u
          WHERE u.salon_id = ${input.salonId}
            AND u.booking_id = ${input.bookingId}::uuid
        )
      ORDER BY cp.expires_at ASC, cp.created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    ),
    usage AS (
      INSERT INTO client_package_usages (
        salon_id, package_id, booking_id,
        package_name_snapshot, package_price_snapshot, package_total_sessions_snapshot,
        credit_value_snapshot, trainer_payout_rate_snapshot, trainer_payout_snapshot
      )
      SELECT
        ${input.salonId}, cp.id, ${input.bookingId}::uuid,
        cp.package_name, COALESCE(cp.price, d.price), cp.total_sessions,
        CASE WHEN COALESCE(cp.price, d.price) IS NOT NULL AND COALESCE(cp.price, d.price) >= 0 THEN COALESCE(cp.price, d.price) / NULLIF(cp.total_sessions, 0) ELSE NULL END,
        0.5,
        CASE WHEN COALESCE(cp.price, d.price) IS NOT NULL AND COALESCE(cp.price, d.price) >= 0 THEN (COALESCE(cp.price, d.price) / NULLIF(cp.total_sessions, 0)) * 0.5 ELSE NULL END
      FROM pkg
      INNER JOIN client_packages cp ON cp.id = pkg.id
      LEFT JOIN client_package_definitions d ON d.id = cp.package_definition_id
      ON CONFLICT (salon_id, booking_id) DO NOTHING
      RETURNING package_id
    )
    SELECT cp.id, cp.package_name, cp.total_sessions, cp.used_sessions, cp.expires_at
    FROM usage
    INNER JOIN client_packages cp ON cp.id = usage.package_id
  ` as {
    id: string;
    package_name: string;
    total_sessions: number;
    used_sessions: number;
    expires_at: string;
  }[];
  const row = rows[0];
  if (!row) return null;
  const totalSessions = Math.max(1, Number(row.total_sessions) || 1);
  const usedSessions = Math.min(totalSessions, Math.max(0, Number(row.used_sessions) || 0));
  return {
    id: String(row.id),
    packageName: String(row.package_name ?? ''),
    totalSessions,
    usedSessions,
    remainingSessions: Math.max(0, totalSessions - usedSessions),
    expiresAt: String(row.expires_at ?? ''),
  };
}

export type PackageFinancialReconciliation = {
  updated: number;
  alreadyCaptured: number;
  needsPackagePrice: number;
  missingBooking: number;
};

/**
 * Captures historical financial data only when the exact package price is
 * already present. It intentionally never infers a price from the standard
 * service price, because that would reintroduce the reporting error.
 */
export async function reconcilePackageUsageFinancials(input: {
  salonId: string;
  apply: boolean;
}): Promise<PackageFinancialReconciliation> {
  await ensureClientPackagesSchema();
  const rows = await sql`
    WITH scoped AS (
      SELECT u.id, u.credit_value_snapshot, cp.price, cp.total_sessions, b.id AS booking_id
      FROM client_package_usages u
      LEFT JOIN client_packages cp ON cp.id = u.package_id
      LEFT JOIN bookings b ON b.id::text = u.booking_id::text AND b.salon_id = u.salon_id
      WHERE u.salon_id = ${input.salonId}
    ), updated AS (
      UPDATE client_package_usages u
      SET
        package_name_snapshot = cp.package_name,
        package_price_snapshot = cp.price,
        package_total_sessions_snapshot = cp.total_sessions,
        credit_value_snapshot = cp.price / NULLIF(cp.total_sessions, 0),
        trainer_payout_rate_snapshot = 0.5,
        trainer_payout_snapshot = (cp.price / NULLIF(cp.total_sessions, 0)) * 0.5
      FROM client_packages cp
      WHERE ${input.apply}
        AND u.salon_id = ${input.salonId}
        AND u.package_id = cp.id
        AND u.credit_value_snapshot IS NULL
        AND cp.price IS NOT NULL
        AND cp.price >= 0
        AND cp.total_sessions > 0
      RETURNING u.id
    )
    SELECT
      (SELECT COUNT(*)::int FROM updated) AS updated,
      (SELECT COUNT(*)::int FROM scoped WHERE credit_value_snapshot IS NOT NULL) AS already_captured,
      (SELECT COUNT(*)::int FROM scoped WHERE credit_value_snapshot IS NULL AND booking_id IS NOT NULL AND (price IS NULL OR price < 0 OR total_sessions <= 0)) AS needs_package_price,
      (SELECT COUNT(*)::int FROM scoped WHERE booking_id IS NULL) AS missing_booking
  ` as {
    updated: number | string;
    already_captured: number | string;
    needs_package_price: number | string;
    missing_booking: number | string;
  }[];
  const row = rows[0];
  return {
    updated: Number(row?.updated ?? 0),
    alreadyCaptured: Number(row?.already_captured ?? 0),
    needsPackagePrice: Number(row?.needs_package_price ?? 0),
    missingBooking: Number(row?.missing_booking ?? 0),
  };
}

export async function updateClientPackage(input: {
  salonId: string;
  packageId: string;
  packageName?: string | null;
  totalSessions: number;
  usedSessions: number;
  price?: number | null;
  validTo?: string | null;
}) {
  await ensureClientPackagesSchema();
  const previousRows = await sql`
    SELECT used_sessions
    FROM client_packages
    WHERE id = ${input.packageId}::uuid AND salon_id = ${input.salonId}
    LIMIT 1
  ` as { used_sessions: number }[];
  const previous = previousRows[0];
  if (!previous) throw new Error('Пакетът не е намерен.');
  const previousUsedSessions = Math.max(0, Number(previous.used_sessions) || 0);
  const totalSessions = Math.max(1, Math.round(Number(input.totalSessions) || 1));
  const usedSessions = Math.min(totalSessions, Math.max(0, Math.round(Number(input.usedSessions) || 0)));
  const rows = await sql`
    UPDATE client_packages
    SET
      package_name = COALESCE(NULLIF(trim(${input.packageName ?? ''}), ''), package_name),
      total_sessions = ${totalSessions},
      used_sessions = ${usedSessions},
      -- Never blank a package's price. An edit that does not resend the price
      -- (e.g. only adjusting credits) must keep the real price the salon set;
      -- otherwise every financial view silently falls back to the full service
      -- price. When the stored price is already missing, recover it from the
      -- package catalog definition this package was created from.
      price = COALESCE(
        ${input.price ?? null},
        client_packages.price,
        (SELECT d.price FROM client_package_definitions d WHERE d.id = client_packages.package_definition_id)
      ),
      expires_at = COALESCE(${input.validTo?.trim() || null}::date, expires_at),
      updated_at = now()
    WHERE id = ${input.packageId}::uuid
      AND salon_id = ${input.salonId}
    RETURNING id, client_name, client_email, package_name, total_sessions, used_sessions,
      price, expires_at::text AS expires_at, purchased_at
  ` as {
    id: string;
    client_name: string | null;
    client_email: string | null;
    package_name: string;
    total_sessions: number;
    used_sessions: number;
    price: string | number | null;
    expires_at: string;
    purchased_at: string;
  }[];
  const row = rows[0];
  if (!row) throw new Error('Пакетът не е намерен.');
  const persistedUsedSessions = Math.max(0, Number(row.used_sessions) || 0);
  await recordClientPackageAdjustment({
    salonId: input.salonId,
    packageId: input.packageId,
    usedSessionsDelta: persistedUsedSessions - previousUsedSessions,
    reason: 'manual_correction',
  });
  return {
    id: String(row.id),
    clientName: String(row.client_name ?? ''),
    clientEmail: row.client_email ? String(row.client_email) : null,
    packageName: String(row.package_name ?? ''),
    totalSessions: Math.max(1, Number(row.total_sessions) || 1),
    usedSessions: Math.max(0, Number(row.used_sessions) || 0),
    remainingSessions: Math.max(0, (Number(row.total_sessions) || 1) - (Number(row.used_sessions) || 0)),
    expiresAt: String(row.expires_at ?? ''),
    purchasedAt: String(row.purchased_at ?? ''),
    price: row.price == null ? null : Number(row.price),
    status: 'active' as const,
  };
}

export async function deactivateClientPackage(input: { salonId: string; packageId: string }) {
  await ensureClientPackagesSchema();
  const rows = await sql`
    UPDATE client_packages
    SET expires_at = CURRENT_DATE - interval '1 day',
        updated_at = now()
    WHERE id = ${input.packageId}::uuid
      AND salon_id = ${input.salonId}
    RETURNING id
  `;
  if (rows.length === 0) throw new Error('Пакетът не е намерен.');
}

export async function restorePackageCreditForBooking(input: { salonId: string; bookingId: string }) {
  await ensureClientPackagesSchema();
  const rows = await sql`
    WITH usage AS (
      DELETE FROM client_package_usages
      WHERE salon_id = ${input.salonId}
        AND booking_id = ${input.bookingId}::uuid
      RETURNING package_id
    ),
    upd AS (
      UPDATE client_packages cp
      SET used_sessions = GREATEST(0, cp.used_sessions - 1),
          updated_at = now()
      FROM usage
      WHERE cp.id = usage.package_id
      RETURNING cp.id, cp.package_name, cp.total_sessions, cp.used_sessions, cp.expires_at
    )
    SELECT id, package_name, total_sessions, used_sessions, expires_at FROM upd
  ` as {
    id: string;
    package_name: string;
    total_sessions: number;
    used_sessions: number;
    expires_at: string;
  }[];
  const row = rows[0];
  if (!row) return null;
  const totalSessions = Math.max(1, Number(row.total_sessions) || 1);
  const usedSessions = Math.min(totalSessions, Math.max(0, Number(row.used_sessions) || 0));
  return {
    id: String(row.id),
    packageName: String(row.package_name ?? ''),
    totalSessions,
    usedSessions,
    remainingSessions: Math.max(0, totalSessions - usedSessions),
    expiresAt: String(row.expires_at ?? ''),
  };
}
