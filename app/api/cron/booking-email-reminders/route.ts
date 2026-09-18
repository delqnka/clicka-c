import { NextRequest, NextResponse } from 'next/server';
import { ensureBookingsSchema } from '@/lib/ensure-bookings-schema';
import { sql } from '@/lib/db';
import { sendBookingReminder, type BookingDetails } from '@/lib/resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get('x-cron-secret') === secret;
}

type ReminderRow = {
  booking_id: string;
  salon_id: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  service_name: string;
  service_price: string | number | null;
  service_duration: number | null;
  booking_quantity: number | null;
  date: string;
  time: string;
  notes: string | null;
  salon_name: string;
  salon_email: string | null;
  salon_phone: string | null;
  salon_address: string | null;
  language: string | null;
};

function toBookingDetails(row: ReminderRow): BookingDetails {
  const servicePrice = row.service_price == null ? null : Number(row.service_price);
  return {
    salonId: row.salon_id,
    bookingId: row.booking_id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientEmail: row.client_email,
    serviceName: row.service_name,
    servicePrice: Number.isFinite(servicePrice) ? servicePrice : null,
    serviceDuration: row.service_duration,
    bookingQuantity: row.booking_quantity,
    date: row.date,
    time: row.time,
    notes: row.notes ?? undefined,
    salonName: row.salon_name,
    salonEmail: row.salon_email ?? undefined,
    salonPhone: row.salon_phone ?? undefined,
    salonAddress: row.salon_address ?? undefined,
    bookingStatus: 'confirmed',
    language: row.language,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureBookingsSchema();

  const rows = (await sql`
    WITH normalized AS (
      SELECT
        b.id AS booking_id,
        CASE
          WHEN b.date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN b.date::date
          WHEN b.date ~ '^\\d{2}\\.\\d{2}\\.\\d{4}$' THEN to_date(b.date, 'DD.MM.YYYY')
          ELSE NULL
        END AS booking_date,
        CASE
          WHEN b.time ~ '^\\d{1,2}:\\d{2}' THEN b.time::time
          ELSE NULL
        END AS booking_time
      FROM bookings b
    ),
    due AS (
      SELECT b.id
      FROM bookings b
      JOIN normalized n ON n.booking_id = b.id
      WHERE b.status = 'confirmed'
        AND b.email_reminder_1h_sent_at IS NULL
        AND (
          b.email_reminder_1h_claimed_at IS NULL
          OR b.email_reminder_1h_claimed_at < now() - interval '15 minutes'
        )
        AND b.client_email IS NOT NULL
        AND trim(b.client_email) <> ''
        AND n.booking_date IS NOT NULL
        AND n.booking_time IS NOT NULL
        AND ((n.booking_date + n.booking_time) AT TIME ZONE 'Europe/Sofia') >= now() + interval '55 minutes'
        AND ((n.booking_date + n.booking_time) AT TIME ZONE 'Europe/Sofia') < now() + interval '65 minutes'
      ORDER BY ((n.booking_date + n.booking_time) AT TIME ZONE 'Europe/Sofia') ASC
      LIMIT 100
    ),
    claimed AS (
      UPDATE bookings b
      SET email_reminder_1h_claimed_at = now(),
          email_reminder_1h_last_error = NULL
      FROM due
      WHERE b.id = due.id
        AND b.email_reminder_1h_sent_at IS NULL
      RETURNING b.*
    )
    SELECT
      c.id AS booking_id,
      c.salon_id,
      c.client_name,
      c.client_phone,
      c.client_email,
      c.service_name,
      c.service_price,
      c.service_duration,
      c.booking_quantity,
      c.date,
      c.time,
      c.notes,
      s.name AS salon_name,
      s.email AS salon_email,
      s.phone AS salon_phone,
      s.address AS salon_address,
      s.language
    FROM claimed c
    JOIN salons s ON s.id::text = c.salon_id::text
  `) as ReminderRow[];

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      await sendBookingReminder(row.client_email, toBookingDetails(row));
      await sql`
        UPDATE bookings
        SET email_reminder_1h_sent_at = now(),
            email_reminder_1h_claimed_at = NULL,
            email_reminder_1h_last_error = NULL
        WHERE id = ${row.booking_id}
      `;
      sent++;
    } catch (err) {
      failed++;
      const message = String((err as { message?: string })?.message ?? err).slice(0, 500);
      console.error('[booking-email-reminders] send failed', row.booking_id, err);
      await sql`
        UPDATE bookings
        SET email_reminder_1h_claimed_at = NULL,
            email_reminder_1h_last_error = ${message}
        WHERE id = ${row.booking_id}
      `;
    }
  }

  return NextResponse.json({ ok: true, checked: rows.length, sent, failed });
}
