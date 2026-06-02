/**
 * Central handler for the "Booking Rescheduled" event.
 *
 * Called from:
 *   - Telegram bot (handleRescheduleBooking)
 *   - Admin panel bookings API (PUT /api/bookings)
 *   - Client self-service manage page (future)
 *
 * Responsibilities:
 *   1. Send reschedule email notification to client
 *   2. Cancel old SMS reminders (for the old date/time)
 *   3. Schedule new SMS reminders (for the new date/time)
 */

import { sql } from '@/lib/db';
import { sendRescheduleNotification } from '@/lib/resend';
import {
  cancelBookingSmsReminders,
  scheduleBookingSmsReminders,
} from '@/lib/sms-reminders';

export type RescheduleEventResult = {
  emailSent: boolean;
  emailReason: string | null;
  remindersUpdated: boolean;
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
    remindersUpdated: false,
  };

  // Load full booking + salon details
  const rows = await sql`
    SELECT
      b.client_name, b.client_email, b.client_phone,
      b.service_name, b.service_duration, b.sms_reminder_consent,
      s.name AS salon_name, s.phone AS salon_phone, s.email AS salon_email,
      s.sms_enabled, s.sms_reminder_mode
    FROM bookings b
    JOIN salons s ON CAST(s.id AS text) = b.salon_id
    WHERE CAST(b.id AS text) = ${opts.bookingId}
    LIMIT 1
  ` as {
    client_name: string;
    client_email: string | null;
    client_phone: string;
    service_name: string;
    service_duration: number | null;
    sms_reminder_consent: boolean;
    salon_name: string;
    salon_phone: string | null;
    salon_email: string | null;
    sms_enabled: boolean;
    sms_reminder_mode: unknown;
  }[];

  if (rows.length === 0) return result;
  const r = rows[0]!;

  // ── 1. Send reschedule email to client ─────────────────────────────────────
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
      });
      result.emailSent = true;
    } catch (err) {
      console.error('[onBookingRescheduled] email failed', err);
      result.emailReason = 'send_failed';
    }
  } else {
    result.emailReason = 'no_email';
  }

  // ── 2 & 3. Update SMS reminders ────────────────────────────────────────────
  try {
    await scheduleBookingSmsReminders({
      salonId: opts.salonId,
      bookingId: opts.bookingId,
      date: opts.newDate,
      time: opts.newTime,
      smsEnabled: r.sms_enabled,
      smsReminderMode: r.sms_reminder_mode,
      smsReminderConsent: r.sms_reminder_consent,
    });
    result.remindersUpdated = true;
  } catch (err) {
    console.error('[onBookingRescheduled] SMS reminders failed', err);
  }

  return result;
}
