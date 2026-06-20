import crypto from 'crypto';
import { sql } from '@/lib/db';
import { bookingStartMinutesFromTimeString, formatLegacyDateDMY } from '@/lib/booking-time';
import { upsertSalonClient } from '@/lib/salon-clients';

export type InsertBookingRow = {
  id: string;
  salonId: string;
  staffMemberId?: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceName: string;
  servicePrice: number | null;
  serviceDuration: number;
  date: string;
  time: string;
  notes: string;
  offerId: string | null;
  status?: 'pending' | 'confirmed';
};

/** Atomically insert only when no active booking overlaps the requested time range. */
export async function insertBookingIfNoOverlap(
  row: InsertBookingRow,
): Promise<{ id: string; manageToken: string } | null> {
  const requestedStartMinutes = bookingStartMinutesFromTimeString(row.time);
  const requestedDurationMinutes = Math.max(5, row.serviceDuration || 30);
  const requestedEndMinutes = requestedStartMinutes + requestedDurationMinutes;
  const legacyDate = formatLegacyDateDMY(row.date) ?? row.date;
  // Generate a random token; store only its SHA-256 hash in the DB so that
  // a database dump cannot be used to forge manage links.
  const manageToken = crypto.randomBytes(32).toString('hex');
  const manageTokenHash = crypto.createHash('sha256').update(manageToken).digest('hex');

  const staffMemberId = row.staffMemberId ?? null;

  // Cancel stale pending-payment bookings for the exact same slot before inserting.
  // Scoped to the same staff member (or unassigned) and exact time so that one staff
  // member's abandoned payment cannot cancel another staff member's pending booking.
  await sql`
    UPDATE bookings
    SET status = 'cancelled', payment_status = 'failed'
    WHERE salon_id = ${row.salonId}
      AND date IN (${row.date}, ${legacyDate})
      AND time = ${row.time}
      AND payment_status IN ('pending', 'unpaid')
      AND created_at < now() - interval '5 minutes'
      AND (staff_member_id IS NOT DISTINCT FROM ${staffMemberId}::uuid)
  `.catch(() => {});

  const inserted = await sql`
    INSERT INTO bookings (
      id, salon_id, staff_member_id, client_name, client_phone, client_email,
      service_name, service_price, service_duration,
      date, time, status, notes,
      offer_id, manage_token
    )
    SELECT
      ${row.id},
      ${row.salonId},
      ${staffMemberId}::uuid,
      ${row.clientName},
      ${row.clientPhone},
      ${row.clientEmail},
      ${row.serviceName},
      ${row.servicePrice},
      ${row.serviceDuration},
      ${row.date},
      ${row.time},
      ${row.status ?? 'pending'},
      ${row.notes || ''},
      ${row.offerId},
      ${manageTokenHash}
    WHERE NOT EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.salon_id = ${row.salonId}
        AND b.date IN (${row.date}, ${legacyDate})
        AND lower(trim(coalesce(b.status, ''))) NOT IN (
          'cancelled', 'canceled', 'отказана', 'анулирана'
        )
        AND NOT (
          b.payment_status IN ('pending', 'unpaid')
          AND b.created_at < now() - interval '5 minutes'
        )
        -- Scope overlap check to the same staff member.
        -- When staffMemberId is NULL (solo / unassigned), match all bookings regardless
        -- of their staff_member_id so legacy null-staff bookings still block the slot.
        -- When staffMemberId is set, match only that staff member's bookings so two
        -- different staff members can independently hold the same time slot.
        AND (
          ${staffMemberId}::uuid IS NULL
          OR b.staff_member_id = ${staffMemberId}::uuid
          OR b.staff_member_id IS NULL
        )
        AND (
          (
            COALESCE(NULLIF(split_part(trim(b.time), ':', 1), '')::int, 0) * 60
            + COALESCE(NULLIF(split_part(trim(b.time), ':', 2), '')::int, 0)
          ) < ${requestedEndMinutes}
          AND (
            (
              COALESCE(NULLIF(split_part(trim(b.time), ':', 1), '')::int, 0) * 60
              + COALESCE(NULLIF(split_part(trim(b.time), ':', 2), '')::int, 0)
            ) + GREATEST(5, COALESCE(b.service_duration, 30))
          ) > ${requestedStartMinutes}
        )
    )
    RETURNING id, manage_token
  `;

  if (inserted.length === 0) return null;
  const result = inserted[0] as { id: string };

  // Save/update client record for every booking source (fire-and-forget)
  upsertSalonClient(row.salonId, row.clientName, {
    phone: row.clientPhone || undefined,
    email: row.clientEmail || undefined,
  }).catch(() => {});

  // Return the raw token (not the hash) — only this response moment exposes it.
  return { id: String(result.id ?? row.id), manageToken };
}

export async function claimOfferSlotAfterBooking(
  offerId: string,
  salonId: string,
): Promise<boolean> {
  const claimed = await sql`
    UPDATE salon_offers
    SET total_claims = total_claims + 1
    WHERE id = ${offerId}::uuid
      AND salon_id = ${salonId}
      AND is_active = true
      AND (max_claims IS NULL OR total_claims < max_claims)
    RETURNING id
  `;
  return claimed.length > 0;
}

export async function deleteBookingById(bookingId: string, salonId: string) {
  await sql`
    DELETE FROM bookings
    WHERE id = ${bookingId} AND salon_id = ${salonId}
  `;
}
