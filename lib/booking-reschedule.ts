/**
 * Central handler for the "Booking Rescheduled" event.
 *
 * Called from:
 *   - Telegram bot (handleRescheduleBooking)
 *   - Admin panel bookings API (PUT /api/bookings)
 *   - Client self-service manage page (future)
 *
 * Responsibilities:
 *   - Send reschedule email notification to client
 */

import { sql } from '@/lib/db';
import { sendRescheduleNotification } from '@/lib/resend';

export type RescheduleEventResult = {
  emailSent: boolean;
  emailReason: string | null;
};

export async function onBookingRescheduled(opts: {
  bookingId: string;
  salonId: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
}): Promise<RescheduleEventResult> {
  const result: RescheduleEventResult = {
    emailSent: false,
    emailReason: null,
  };

  const rows = await sql`
    SELECT
      b.client_name, b.client_email,
      b.service_name,
      s.name AS salon_name, s.phone AS salon_phone, s.language
    FROM bookings b
    JOIN salons s ON CAST(s.id AS text) = b.salon_id
    WHERE CAST(b.id AS text) = ${opts.bookingId}
    LIMIT 1
  ` as {
    client_name: string;
    client_email: string | null;
    service_name: string;
    salon_name: string;
    salon_phone: string | null;
    language: string | null;
  }[];

  if (rows.length === 0) return result;
  const r = rows[0]!;

  const clientEmail = r.client_email?.trim();
  if (clientEmail) {
    try {
      await sendRescheduleNotification(clientEmail, {
        clientName: r.client_name,
        serviceName: r.service_name,
        oldDate: opts.oldDate,
        oldTime: opts.oldTime,
        newDate: opts.newDate,
        newTime: opts.newTime,
        salonName: r.salon_name,
        salonPhone: r.salon_phone ?? undefined,
        salonId: opts.salonId,
        language: r.language,
      });
      result.emailSent = true;
    } catch (err) {
      console.error('[onBookingRescheduled] email failed', err);
      result.emailReason = 'send_failed';
    }
  } else {
    result.emailReason = 'no_email';
  }

  return result;
}
