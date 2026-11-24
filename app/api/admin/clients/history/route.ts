import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { ensureClientPackagesSchema } from '@/lib/client-packages';
import { normalizePhoneForMatch } from '@/lib/salon-clients';

/**
 * Full dossier for one client: every booking (past and upcoming) and every
 * package, matched by email, phone (format-normalized) or exact name — so the
 * studio sees the whole history in one place instead of guessing. Read-only.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const slug = String(body?.slug ?? request.nextUrl.searchParams.get('slug') ?? '').trim();
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const salonId = auth.salon.salonId;
  const name = String(body?.name ?? '').trim();
  const phoneDigits = normalizePhoneForMatch(String(body?.phone ?? ''));
  const email = String(body?.email ?? '').trim().toLowerCase();

  if (!name && !phoneDigits && !email) {
    return NextResponse.json({ error: 'Липсват данни за клиента.' }, { status: 400 });
  }

  await ensureClientPackagesSchema();

  const bookings = await sql`
    SELECT
      b.id::text AS id,
      b.date::text AS date,
      b.time,
      b.service_name,
      b.status,
      b.booking_quantity,
      b.created_at::text AS booked_at,
      (u.booking_id IS NOT NULL) AS by_package,
      u.package_name_snapshot AS package_name,
      u.used_at::text AS credit_used_at
    FROM bookings b
    LEFT JOIN client_package_usages u ON u.booking_id::text = b.id::text
    WHERE b.salon_id = ${salonId}
      AND (
        (${email} <> '' AND lower(trim(coalesce(b.client_email, ''))) = ${email})
        OR (${phoneDigits} <> '' AND regexp_replace(regexp_replace(coalesce(b.client_phone, ''), '\\D', '', 'g'), '^(?:00359|359)?0*', '') = ${phoneDigits})
        OR (${name} <> '' AND lower(trim(coalesce(b.client_name, ''))) = lower(${name}))
      )
    ORDER BY b.date DESC, b.time DESC
  `;

  const packages = await sql`
    SELECT
      cp.id::text AS id,
      cp.package_name,
      cp.total_sessions,
      cp.used_sessions,
      GREATEST(0, cp.total_sessions - cp.used_sessions)::int AS remaining_sessions,
      cp.price,
      cp.source,
      cp.purchased_at::text AS purchased_at,
      to_char(cp.expires_at, 'YYYY-MM-DD') AS expires_at,
      CASE
        WHEN cp.expires_at < CURRENT_DATE THEN 'expired'
        WHEN cp.used_sessions >= cp.total_sessions THEN 'used'
        ELSE 'active'
      END AS status
    FROM client_packages cp
    WHERE cp.salon_id = ${salonId}
      AND (
        (${email} <> '' AND lower(trim(coalesce(cp.client_email, ''))) = ${email})
        OR (${phoneDigits} <> '' AND regexp_replace(regexp_replace(coalesce(cp.client_phone, ''), '\\D', '', 'g'), '^(?:00359|359)?0*', '') = ${phoneDigits})
        OR (${name} <> '' AND lower(trim(coalesce(cp.client_name, ''))) = lower(${name}))
      )
    ORDER BY cp.purchased_at DESC, cp.created_at DESC
  `;

  return NextResponse.json({ bookings, packages });
}
