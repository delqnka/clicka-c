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

export async function ensureClientPackagesSchema() {
  await ensureSalonClientsSchema();
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await sql`
    CREATE TABLE IF NOT EXISTS client_packages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      salon_id text NOT NULL,
      client_id uuid REFERENCES salon_clients(id) ON DELETE SET NULL,
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
  price?: number | null;
  source?: 'admin' | 'online';
}) {
  await ensureClientPackagesSchema();
  const client = await upsertSalonClient(input.salonId, input.clientName, {
    phone: input.clientPhone ?? undefined,
    email: input.clientEmail ?? undefined,
  });
  const totalSessions = Math.max(1, Math.round(Number(input.totalSessions) || 1));
  const packageName = `${totalSessions} тренировки`;
  const rows = await sql`
    INSERT INTO client_packages (
      salon_id, client_id, client_name, client_phone, client_email,
      package_name, total_sessions, price, expires_at, source
    )
    VALUES (
      ${input.salonId},
      ${client.id}::uuid,
      ${input.clientName.trim()},
      ${input.clientPhone?.trim() || null},
      ${input.clientEmail?.trim().toLowerCase() || null},
      ${packageName},
      ${totalSessions},
      ${input.price ?? null},
      (CURRENT_DATE + interval '30 days')::date,
      ${input.source ?? 'admin'}
    )
    RETURNING id
  `;
  return { id: String((rows[0] as { id: string }).id) };
}

export async function consumePackageForCompletedBooking(input: {
  salonId: string;
  bookingId: string;
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
}) {
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
      RETURNING cp.id
    ),
    usage AS (
      INSERT INTO client_package_usages (salon_id, package_id, booking_id)
      SELECT ${input.salonId}, upd.id, ${input.bookingId}::uuid
      FROM upd
      ON CONFLICT (salon_id, booking_id) DO NOTHING
      RETURNING package_id
    )
    SELECT package_id FROM usage
  `;
  return rows.length > 0;
}

