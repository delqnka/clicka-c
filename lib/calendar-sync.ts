import { sql } from '@/lib/db';
import type { CalendarBookingRow } from '@/lib/calendar-ics';
import { isCancelledStatus } from '@/lib/booking-time';
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  loadGoogleCalendarConnection,
  updateGoogleCalendarEvent,
} from '@/lib/google-calendar';

export type BookingCalendarSyncInput = {
  id: string;
  salonId: string;
  salonName: string;
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  serviceName: string;
  serviceDuration?: number | null;
  date: string;
  time: string;
  status: string;
  notes?: string | null;
  googleCalendarEventId?: string | null;
};

function toCalendarRow(booking: BookingCalendarSyncInput): CalendarBookingRow {
  return {
    id: booking.id,
    client_name: booking.clientName,
    client_phone: booking.clientPhone,
    client_email: booking.clientEmail,
    service_name: booking.serviceName,
    service_duration: booking.serviceDuration,
    date: booking.date,
    time: booking.time,
    status: booking.status,
    notes: booking.notes,
  };
}

export async function syncBookingToGoogleCalendar(booking: BookingCalendarSyncInput): Promise<void> {
  const connection = await loadGoogleCalendarConnection(booking.salonId);
  if (!connection) return;

  const eventId = String(booking.googleCalendarEventId ?? '').trim();

  if (isCancelledStatus(booking.status)) {
    if (eventId) {
      await deleteGoogleCalendarEvent(connection, eventId);
      await sql`
        UPDATE bookings
        SET google_calendar_event_id = NULL
        WHERE id = ${booking.id} AND salon_id = ${booking.salonId}
      `;
    }
    return;
  }

  const row = toCalendarRow(booking);

  if (eventId) {
    const ok = await updateGoogleCalendarEvent(connection, eventId, row, booking.salonName);
    if (ok) return;
  }

  const createdId = await createGoogleCalendarEvent(connection, row, booking.salonName);
  if (createdId) {
    await sql`
      UPDATE bookings
      SET google_calendar_event_id = ${createdId}
      WHERE id = ${booking.id} AND salon_id = ${booking.salonId}
    `;
  }
}

export async function syncAllBookingsToGoogleCalendar(salonId: string, salonName: string): Promise<number> {
  const connection = await loadGoogleCalendarConnection(salonId);
  if (!connection) return 0;

  const rows = await sql`
    SELECT
      id, client_name, client_phone, client_email,
      service_name, service_duration, date, time, status, notes,
      google_calendar_event_id
    FROM bookings
    WHERE salon_id = ${salonId}
      AND status IN ('pending', 'confirmed')
    ORDER BY date ASC, time ASC
    LIMIT 500
  `;

  let synced = 0;
  for (const raw of rows) {
    const row = raw as Record<string, unknown>;
    await syncBookingToGoogleCalendar({
      id: String(row.id),
      salonId,
      salonName,
      clientName: String(row.client_name ?? ''),
      clientPhone: row.client_phone ? String(row.client_phone) : null,
      clientEmail: row.client_email ? String(row.client_email) : null,
      serviceName: String(row.service_name ?? ''),
      serviceDuration: row.service_duration != null ? Number(row.service_duration) : null,
      date: String(row.date ?? ''),
      time: String(row.time ?? ''),
      status: String(row.status ?? ''),
      notes: row.notes ? String(row.notes) : null,
      googleCalendarEventId: row.google_calendar_event_id ? String(row.google_calendar_event_id) : null,
    });
    synced += 1;
  }
  return synced;
}

export async function loadBookingForCalendarSync(
  bookingId: string,
  salonId: string,
): Promise<BookingCalendarSyncInput | null> {
  const rows = await sql`
    SELECT
      id, client_name, client_phone, client_email,
      service_name, service_duration, date, time, status, notes,
      google_calendar_event_id
    FROM bookings
    WHERE id = ${bookingId} AND salon_id = ${salonId}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0] as Record<string, unknown>;
  const salonRows = await sql`
    SELECT name FROM salons WHERE CAST(id AS text) = ${salonId} LIMIT 1
  `;
  const salonName = String((salonRows[0] as { name?: string })?.name ?? '');

  return {
    id: String(row.id),
    salonId,
    salonName,
    clientName: String(row.client_name ?? ''),
    clientPhone: row.client_phone ? String(row.client_phone) : null,
    clientEmail: row.client_email ? String(row.client_email) : null,
    serviceName: String(row.service_name ?? ''),
    serviceDuration: row.service_duration != null ? Number(row.service_duration) : null,
    date: String(row.date ?? ''),
    time: String(row.time ?? ''),
    status: String(row.status ?? ''),
    notes: row.notes ? String(row.notes) : null,
    googleCalendarEventId: row.google_calendar_event_id ? String(row.google_calendar_event_id) : null,
  };
}
