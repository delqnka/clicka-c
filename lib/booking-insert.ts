import crypto from 'crypto';
import { sql } from '@/lib/db';
import { bookingStartMinutesFromTimeString, formatLegacyDateDMY } from '@/lib/booking-time';

export type InsertBookingRow = {
  id: string;
  salonId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceName: string;
  servicePrice: number | null;
  serviceDuration: number;
  date: string;
  time: string;
  notes: string;
  smsReminderConsent: boolean;
  offerId: string | null;
};

/** Atomically insert only when no active booking overlaps the requested time range. */
export async function insertBookingIfNoOverlap(
  row: InsertBookingRow,
): Promise<{ id: string; manageToken: string } | null> {
  const requestedStartMinutes = bookingStartMinutesFromTimeString(row.time);
  const requestedDurationMinutes = Math.max(5, row.serviceDuration || 30);
  const requestedEndMinutes = requestedStartMinutes + requestedDurationMinutes;
  const legacyDate = formatLegacyDateDMY(row.date) ?? row.date;
  const consentAt = row.smsReminderConsent ? new Date().toISOString() : null;
  const manageToken = crypto.randomBytes(16).toString('hex');

  const inserted = await sql`
    INSERT INTO bookings (
      id, salon_id, client_name, client_phone, client_email,
      service_name, service_price, service_duration,
      date, time, status, notes,
      sms_reminder_consent, sms_reminder_consent_at,
      offer_id, manage_token
    )
    SELECT
      ${row.id},
      ${row.salonId},
      ${row.clientName},
      ${row.clientPhone},
      ${row.clientEmail},
      ${row.serviceName},
      ${row.servicePrice},
      ${row.serviceDuration},
      ${row.date},
      ${row.time},
      'pending',
      ${row.notes || ''},
      ${row.smsReminderConsent},
      ${consentAt},
      ${row.offerId},
      ${manageToken}
    WHERE NOT EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.salon_id = ${row.salonId}
        AND b.date IN (${row.date}, ${legacyDate})
        AND lower(trim(coalesce(b.status, ''))) NOT IN (
          'cancelled', 'canceled', 'отказана', 'анулирана'
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
  const result = inserted[0] as { id: string; manage_token: string };
  return { id: String(result.id ?? row.id), manageToken: String(result.manage_token ?? manageToken) };
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
