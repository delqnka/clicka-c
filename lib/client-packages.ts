import { sql } from '@/lib/db';
import { ensureSalonClientsSchema } from '@/lib/ensure-salon-clients-schema';
import { upsertSalonClient } from '@/lib/salon-clients';

export type ClientPackageSummary = {
  id: string;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  expiresAt: string;
  status: 'active' | 'expired' | 'used';
};

export type ClientPackageUsageSummary = {
  id: string;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  expiresAt: string;
};

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
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
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
      used_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (salon_id, booking_id)
    )
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
      package_name, total_sessions, used_sessions, price, purchased_at, expires_at, source
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
      ${input.price ?? null},
      COALESCE(${input.validFrom?.trim() || null}::date, now()),
      COALESCE(${validTo}::date, (CURRENT_DATE + (${validityDays}::int * interval '1 day'))::date),
      ${input.source ?? 'admin'}
    )
    RETURNING id, package_name, total_sessions, used_sessions, expires_at, purchased_at
  ` as {
    id: string;
    package_name: string;
    total_sessions: number;
    used_sessions: number;
    expires_at: string;
    purchased_at: string;
  }[];
  const row = rows[0]!;
  const returnedTotalSessions = Math.max(1, Number(row.total_sessions) || totalSessions);
  const returnedUsedSessions = Math.min(returnedTotalSessions, Math.max(0, Number(row.used_sessions) || 0));
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
}): Promise<ClientPackageUsageSummary | null> {
  await ensureClientPackagesSchema();
  const email = input.clientEmail?.trim().toLowerCase() || '';
  const phoneDigits = (input.clientPhone ?? '').replace(/\D/g, '');
  const name = input.clientName.trim();

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
          (${email} <> '' AND lower(trim(coalesce(cp.client_email, ''))) = ${email})
          OR (${phoneDigits} <> '' AND regexp_replace(coalesce(cp.client_phone, ''), '\\D', '', 'g') = ${phoneDigits})
          OR lower(trim(cp.client_name)) = lower(trim(${name}))
        )
      ORDER BY cp.expires_at ASC, cp.created_at ASC
      LIMIT 1
    ),
    upd AS (
      UPDATE client_packages cp
      SET used_sessions = cp.used_sessions + 1,
          updated_at = now()
      FROM pkg
      WHERE cp.id = pkg.id
        AND cp.used_sessions < cp.total_sessions
      RETURNING cp.id, cp.package_name, cp.total_sessions, cp.used_sessions, cp.expires_at
    ),
    usage AS (
      INSERT INTO client_package_usages (salon_id, package_id, booking_id)
      SELECT ${input.salonId}, upd.id, ${input.bookingId}::uuid
      FROM upd
      ON CONFLICT (salon_id, booking_id) DO NOTHING
      RETURNING package_id
    )
    SELECT upd.id, upd.package_name, upd.total_sessions, upd.used_sessions, upd.expires_at
    FROM upd
    INNER JOIN usage ON usage.package_id = upd.id
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
  const totalSessions = Math.max(1, Math.round(Number(input.totalSessions) || 1));
  const usedSessions = Math.min(totalSessions, Math.max(0, Math.round(Number(input.usedSessions) || 0)));
  const rows = await sql`
    UPDATE client_packages
    SET
      package_name = COALESCE(NULLIF(trim(${input.packageName ?? ''}), ''), package_name),
      total_sessions = ${totalSessions},
      used_sessions = ${usedSessions},
      price = ${input.price ?? null},
      expires_at = COALESCE(${input.validTo?.trim() || null}::date, expires_at),
      updated_at = now()
    WHERE id = ${input.packageId}::uuid
      AND salon_id = ${input.salonId}
    RETURNING id, package_name, total_sessions, used_sessions, expires_at
  ` as {
    id: string;
    package_name: string;
    total_sessions: number;
    used_sessions: number;
    expires_at: string;
  }[];
  const row = rows[0];
  if (!row) throw new Error('Пакетът не е намерен.');
  return {
    id: String(row.id),
    packageName: String(row.package_name ?? ''),
    totalSessions: Math.max(1, Number(row.total_sessions) || 1),
    usedSessions: Math.max(0, Number(row.used_sessions) || 0),
    remainingSessions: Math.max(0, (Number(row.total_sessions) || 1) - (Number(row.used_sessions) || 0)),
    expiresAt: String(row.expires_at ?? ''),
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
