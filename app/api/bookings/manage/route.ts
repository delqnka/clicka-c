import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureBookingsSchema } from '@/lib/ensure-bookings-schema';
import { isCancelledStatus } from '@/lib/booking-time';
import { sendTelegramMessage } from '@/lib/telegram';
import { runAfterResponse } from '@/lib/run-after-response';
import {
  loadBookingForCalendarSync,
  syncBookingToGoogleCalendar,
} from '@/lib/calendar-sync';
import { cancelBookingSmsReminders } from '@/lib/sms-reminders';

export const dynamic = 'force-dynamic';

function formatBgDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' });
}

type BookingRow = {
  id: string;
  salon_id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  service_name: string;
  service_price: number | null;
  service_duration: number | null;
  date: string;
  time: string;
  status: string;
  notes: string | null;
  manage_token: string | null;
};

async function loadBookingByToken(
  bookingId: string,
  token: string,
): Promise<{ booking: BookingRow; salonName: string; salonSlug: string; telegramChatId: string } | null> {
  await ensureBookingsSchema();

  // New tokens are stored as SHA-256 hashes. Old tokens (pre-migration) are
  // stored as plaintext 32-char hex. We try the hash first, then fall back.
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const rows = await sql`
    SELECT
      b.id, b.salon_id, b.client_name, b.client_phone, b.client_email,
      b.service_name, b.service_price, b.service_duration,
      b.date, b.time, b.status, b.notes, b.manage_token,
      s.name AS salon_name, s.slug AS salon_slug, s.telegram_chat_id
    FROM bookings b
    JOIN salons s ON CAST(s.id AS text) = b.salon_id
    WHERE b.id = ${bookingId}
      AND (b.manage_token = ${tokenHash} OR b.manage_token = ${token})
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0] as BookingRow & { salon_name: string; salon_slug: string; telegram_chat_id: string | null };
  return {
    booking: row,
    salonName: String(row.salon_name ?? ''),
    salonSlug: String(row.salon_slug ?? ''),
    telegramChatId: String(row.telegram_chat_id ?? '').trim(),
  };
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') ?? '';
  const token = request.nextUrl.searchParams.get('token') ?? '';

  if (!id || !token) {
    return NextResponse.json({ error: 'Липсват параметри.' }, { status: 400 });
  }

  const result = await loadBookingByToken(id, token);
  if (!result) {
    return NextResponse.json({ error: 'Резервацията не е намерена.' }, { status: 404 });
  }

  const { booking, salonName } = result;
  return NextResponse.json({
    id: booking.id,
    clientName: booking.client_name,
    serviceName: booking.service_name,
    servicePrice: booking.service_price,
    serviceDuration: booking.service_duration,
    date: booking.date,
    time: booking.time,
    status: booking.status,
    salonName,
    canModify: !isCancelledStatus(booking.status) && booking.status !== 'completed',
  });
}

export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') ?? '';
  const token = request.nextUrl.searchParams.get('token') ?? '';

  if (!id || !token) {
    return NextResponse.json({ error: 'Липсват параметри.' }, { status: 400 });
  }

  let body: { action: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const result = await loadBookingByToken(id, token);
  if (!result) {
    return NextResponse.json({ error: 'Резервацията не е намерена.' }, { status: 404 });
  }

  const { booking, salonName, telegramChatId } = result;

  if (isCancelledStatus(booking.status) || booking.status === 'completed') {
    return NextResponse.json({ error: 'Резервацията не може да бъде променена.' }, { status: 400 });
  }

  if (body.action === 'cancel') {
    await sql`
      UPDATE bookings SET status = 'cancelled' WHERE id = ${id}
    `;

    void cancelBookingSmsReminders(id).catch((err) =>
      console.error('[manage] cancel SMS', err),
    );

    runAfterResponse(
      loadBookingForCalendarSync(id, booking.salon_id)
        .then((b) => (b ? syncBookingToGoogleCalendar(b) : null))
        .catch((err) => console.error('[manage] calendar sync', err)),
    );

    if (telegramChatId) {
      runAfterResponse(
        sendTelegramMessage(
          telegramChatId,
          [
            `❌ <b>Отказана резервация</b>`,
            `👤 ${booking.client_name}`,
            `✂️ ${booking.service_name}`,
            `🗓 ${formatBgDate(booking.date)} в ${booking.time}`,
            '',
            'Клиентът отказа резервацията си.',
          ].join('\n'),
        ).catch((err) => console.error('[manage] telegram notify', err)),
      );
    }

    return NextResponse.json({ success: true, status: 'cancelled' });
  }

  return NextResponse.json({ error: 'Невалидно действие.' }, { status: 400 });
}
