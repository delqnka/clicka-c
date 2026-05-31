import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  claimOfferSlotAfterBooking,
  deleteBookingById,
  insertBookingIfNoOverlap,
} from '@/lib/booking-insert';
import { dispatchBookingNotifications } from '@/lib/booking-notifications';
import {
  formatLegacyDateDMY,
  isCancelledStatus,
  parseTimeToMinutes,
} from '@/lib/booking-time';
import { ensureBookingsSchema } from '@/lib/ensure-bookings-schema';
import { ensureOffersSchema } from '@/lib/ensure-offers-schema';
import { offerHasSpotsLeft, offerVisibleToClient } from '@/lib/salon-offers';
import type { SalonOfferRow } from '@/lib/salon-offers';
import { requireAdminRequestAccess, resolveSalonBySlugOrHost } from '@/lib/admin-auth';
import { isDateBlockedAllDay, isBlockedForStartTime, normalizeBookingBlocks } from '@/lib/booking-blocks';
import { runAfterResponse } from '@/lib/run-after-response';
import {
  loadBookingForCalendarSync,
  syncBookingToGoogleCalendar,
} from '@/lib/calendar-sync';
import {
  cancelBookingSmsReminders,
  scheduleBookingSmsReminders,
} from '@/lib/sms-reminders';
import { sendGoogleReviewInvitation } from '@/lib/resend';

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

function formatBgDateDMY(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('bg-BG');
}

async function resolveSalonFromRequest(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lookup = await resolveSalonBySlugOrHost({
    slug: request.headers.get('x-salon-slug') || searchParams.get('slug'),
    host: request.headers.get('host'),
    includeInactive: false,
  });

  if (!lookup) {
    return { error: NextResponse.json({ error: 'Неидентифициран салон' }, { status: 400 }) } as const;
  }

  const salons = await sql`
    SELECT CAST(id AS text) AS salon_id, name, email, slug, phone, city, address,
           telegram_chat_id, google_place_id, opening_hours,
           sms_enabled, sms_reminder_mode
    FROM salons
    WHERE slug = ${lookup.slug} AND is_active = true
  `;

  if (salons.length === 0) {
    return { error: NextResponse.json({ error: 'Салонът не е намерен' }, { status: 404 }) } as const;
  }

  return { salonSlug: lookup.slug, salon: salons[0] } as const;
}

export async function GET(request: NextRequest) {
  const { searchParams: requestSearchParams } = new URL(request.url);

  if (requestSearchParams.get('public') === '1' && requestSearchParams.get('date')) {
    const resolved = await resolveSalonFromRequest(request);
    if ('error' in resolved) return resolved.error;
    const salonId = String((resolved.salon as Record<string, unknown>).salon_id ?? '');
    const date = String(requestSearchParams.get('date') ?? '').trim();
    if (!date) return NextResponse.json({ occupied: [] });
    const legacyDate = formatLegacyDateDMY(date);
    const occupiedRows = await sql`
      SELECT time, service_duration, status
      FROM bookings
      WHERE salon_id = ${salonId}
        AND date IN (${date}, ${legacyDate ?? date})
      ORDER BY time ASC
    `;
    const occupied = occupiedRows
      .filter((r) => !isCancelledStatus((r as Record<string, unknown>).status))
      .map((r) => {
        const row = r as Record<string, unknown>;
        const mins = parseTimeToMinutes(row.time);
        if (mins == null) return null;
        const hh = String(Math.floor(mins / 60)).padStart(2, '0');
        const mm = String(mins % 60).padStart(2, '0');
        return {
          time: `${hh}:${mm}`,
          duration: Math.max(5, Number(row.service_duration ?? 30) || 30),
        };
      })
      .filter((x): x is { time: string; duration: number } => x != null);
    return NextResponse.json({ occupied });
  }

  const auth = await requireAdminRequestAccess(request, requestSearchParams.get('slug'));
  if (!auth.ok) return auth.response;

  const resolved = await resolveSalonFromRequest(request);
  if ('error' in resolved) return resolved.error;

  const status = requestSearchParams.get('status') as BookingStatus | null;
  const limitRaw = requestSearchParams.get('limit');
  const limit = Math.min(Math.max(Number(limitRaw ?? '50') || 50, 1), 200);

  if (status && !['pending', 'confirmed', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Невалиден статус' }, { status: 400 });
  }

  const rows = status
    ? await sql`
        SELECT
          id, client_name, client_phone, client_email,
          service_name, service_price, service_duration,
          date, time, status, notes, created_at
        FROM bookings
        WHERE salon_id = ${String((resolved.salon as Record<string, unknown>).salon_id ?? '')} AND status = ${status}
        ORDER BY date DESC, time DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT
          id, client_name, client_phone, client_email,
          service_name, service_price, service_duration,
          date, time, status, notes, created_at
        FROM bookings
        WHERE salon_id = ${String((resolved.salon as Record<string, unknown>).salon_id ?? '')}
        ORDER BY date DESC, time DESC
        LIMIT ${limit}
      `;

  return NextResponse.json({ bookings: rows });
}

export async function POST(request: NextRequest) {
  try {
    await ensureBookingsSchema();
  } catch (err) {
    console.error('[bookings POST] schema', err);
    return NextResponse.json(
      { error: 'Резервационната система не е налична. Моля опитайте по-късно.' },
      { status: 503 },
    );
  }

  const resolved = await resolveSalonFromRequest(request);
  if ('error' in resolved) return resolved.error;

  let body: {
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    serviceName: string;
    servicePrice: number;
    serviceDuration: number;
    date: string;
    time: string;
    notes?: string;
    smsReminderConsent?: boolean;
    offerId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const {
    clientName,
    clientPhone,
    clientEmail,
    serviceName,
    servicePrice,
    serviceDuration,
    date,
    time,
    notes,
    smsReminderConsent,
    offerId,
  } = body;
  const normalizedNotes = typeof notes === 'string' ? notes.trim() : '';
  const hasSmsReminderConsent = smsReminderConsent === true;
  const normalizedOfferId = typeof offerId === 'string' ? offerId.trim() : '';

  if (!clientName || !clientPhone || !clientEmail || !serviceName || !date || !time) {
    return NextResponse.json(
      { error: 'Моля попълнете всички задължителни полета' },
      { status: 400 }
    );
  }

  const normalizedClientEmail = String(clientEmail).trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalizedClientEmail)) {
    return NextResponse.json({ error: 'Моля, въведете валиден имейл адрес.' }, { status: 400 });
  }

  const salonId = String((resolved.salon as Record<string, unknown>).salon_id ?? '');
  const bookingId = crypto.randomUUID();
  let resolvedServiceName = String(serviceName).trim();
  let priceValue =
    servicePrice != null && Number.isFinite(Number(servicePrice)) ? Number(servicePrice) : null;
  let durationValue =
    serviceDuration != null && Number.isFinite(Number(serviceDuration))
      ? Math.round(Number(serviceDuration))
      : null;
  let bookingOfferId: string | null = null;

  if (normalizedOfferId) {
    await ensureOffersSchema();
    const offerRows = await sql`
      SELECT id, title, description, discount, images, is_active, valid_until,
             campaign_valid_from, campaign_valid_until, max_claims, total_claims, duration_min
      FROM salon_offers
      WHERE id = ${normalizedOfferId}::uuid AND salon_id = ${salonId}
      LIMIT 1
    `;
    if (offerRows.length === 0) {
      return NextResponse.json({ error: 'Офертата не е намерена.' }, { status: 404 });
    }
    const offer = offerRows[0] as SalonOfferRow;
    if (!offerVisibleToClient(offer)) {
      return NextResponse.json(
        { error: 'Тази оферта вече не е налична за резервация.' },
        { status: 400 },
      );
    }
    if (!offerHasSpotsLeft(offer)) {
      return NextResponse.json(
        { error: 'Всички места по тази оферта са заети.' },
        { status: 409 },
      );
    }
    resolvedServiceName = `[Оферта] ${String(offer.title ?? '').trim()}`;
    durationValue = Math.max(15, Number(offer.duration_min ?? 60) || 60);
    if (offer.discount != null && Number.isFinite(Number(offer.discount))) {
      priceValue = null;
    }
    bookingOfferId = normalizedOfferId;
  }

  const bookingBlocks = normalizeBookingBlocks(
    resolved.salon.opening_hours && typeof resolved.salon.opening_hours === 'object'
      ? (resolved.salon.opening_hours as Record<string, unknown>).booking_blocks
      : null
  );
  if (isDateBlockedAllDay(bookingBlocks, date)) {
    return NextResponse.json(
      { error: 'Салонът не работи на избраната дата. Моля изберете друга.' },
      { status: 400 }
    );
  }
  if (isBlockedForStartTime(bookingBlocks, date, time, durationValue ?? 30)) {
    return NextResponse.json(
      { error: 'Избраният час е блокиран. Моля изберете друг свободен час.' },
      { status: 400 }
    );
  }

  let insertedBooking: { id: string } | null = null;
  try {
    insertedBooking = await insertBookingIfNoOverlap({
      id: bookingId,
      salonId,
      clientName,
      clientPhone,
      clientEmail: normalizedClientEmail,
      serviceName: resolvedServiceName,
      servicePrice: priceValue,
      serviceDuration: Math.max(5, durationValue ?? 30),
      date,
      time,
      notes: normalizedNotes,
      smsReminderConsent: hasSmsReminderConsent,
      offerId: bookingOfferId,
    });
  } catch (err) {
    const dbErr = err as { code?: string } | null;
    if (dbErr?.code === '23505') {
      return NextResponse.json(
        { error: 'Този час току-що беше зает. Моля изберете друг свободен час.' },
        { status: 409 },
      );
    }
    console.error('[bookings POST]', err);
    return NextResponse.json(
      { error: 'Резервацията не можа да бъде записана. Моля опитайте отново.' },
      { status: 500 },
    );
  }

  if (!insertedBooking) {
    return NextResponse.json(
      { error: 'Този час току-що беше зает. Моля изберете друг свободен час.' },
      { status: 409 },
    );
  }

  if (bookingOfferId) {
    const claimed = await claimOfferSlotAfterBooking(bookingOfferId, salonId);
    if (!claimed) {
      await deleteBookingById(insertedBooking.id, salonId);
      return NextResponse.json(
        { error: 'Всички места по тази оферта са заети.' },
        { status: 409 },
      );
    }
  }

  const bookingDetails = {
    bookingId: insertedBooking.id,
    clientName,
    clientPhone,
    clientEmail: normalizedClientEmail,
    serviceName: resolvedServiceName,
    servicePrice,
    serviceDuration,
    date,
    time,
    notes: normalizedNotes || undefined,
    salonName: resolved.salon.name,
    salonEmail: resolved.salon.email || undefined,
    salonPhone: resolved.salon.phone || undefined,
    salonAddress:
      [resolved.salon.address, resolved.salon.city]
        .map(value => String(value ?? '').trim())
        .filter(Boolean)
        .join(', ') || undefined,
  };

  const telegramChatId = String((resolved.salon as Record<string, unknown>).telegram_chat_id ?? '').trim();

  runAfterResponse(
    dispatchBookingNotifications({
      salonEmail: resolved.salon.email ? String(resolved.salon.email) : null,
      clientEmail: normalizedClientEmail,
      telegramChatId,
      bookingDetails,
      telegramDetails: {
        ...bookingDetails,
        clientEmail: normalizedClientEmail,
      },
    }),
  );

  runAfterResponse(
    scheduleBookingSmsReminders({
      salonId,
      bookingId: insertedBooking.id,
      date,
      time,
      smsEnabled: (resolved.salon as Record<string, unknown>).sms_enabled === true,
      smsReminderMode: (resolved.salon as Record<string, unknown>).sms_reminder_mode,
      smsReminderConsent: hasSmsReminderConsent,
    }),
  );

  runAfterResponse(
    syncBookingToGoogleCalendar({
      id: insertedBooking.id,
      salonId,
      salonName: String(resolved.salon.name ?? ''),
      clientName,
      clientPhone,
      clientEmail: normalizedClientEmail,
      serviceName: resolvedServiceName,
      serviceDuration: durationValue,
      date,
      time,
      status: 'pending',
      notes: normalizedNotes || null,
      googleCalendarEventId: null,
    }).catch((err) => console.error('[bookings POST] calendar sync', err)),
  );

  return NextResponse.json({
    success: true,
    bookingId: insertedBooking.id,
    message: `Резервацията е потвърдена за ${formatBgDateDMY(date)} в ${time}. Очакваме ви!`,
  });
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureBookingsSchema();
  } catch (err) {
    console.error('[bookings PATCH] schema', err);
    return NextResponse.json(
      { error: 'Резервационната система не е налична. Моля опитайте по-късно.' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const auth = await requireAdminRequestAccess(request, searchParams.get('slug'));
  if (!auth.ok) return auth.response;

  const resolved = await resolveSalonFromRequest(request);
  if ('error' in resolved) return resolved.error;

  let body: { bookingId?: string; status?: BookingStatus };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const bookingId = body.bookingId?.trim();
  const status = body.status;

  if (!bookingId) {
    return NextResponse.json({ error: 'Липсва bookingId' }, { status: 400 });
  }
  if (!status || !['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
    return NextResponse.json({ error: 'Невалиден статус' }, { status: 400 });
  }

  const salonId = String((resolved.salon as Record<string, unknown>).salon_id ?? '');

  const updated = await sql`
    UPDATE bookings
    SET status = ${status},
        completed_at = CASE WHEN ${status} = 'completed' THEN now() ELSE completed_at END
    WHERE id = ${bookingId} AND salon_id = ${salonId}
    RETURNING id, client_email, client_name, service_name, client_phone,
              service_duration, date, time, notes, google_calendar_event_id, status
  `;

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Резервацията не е намерена' }, { status: 404 });
  }

  if (status === 'cancelled') {
    void cancelBookingSmsReminders(bookingId).catch((err) =>
      console.error('[bookings PATCH] cancel SMS', err),
    );
  }

  runAfterResponse(
    loadBookingForCalendarSync(bookingId, salonId)
      .then((booking) => (booking ? syncBookingToGoogleCalendar(booking) : null))
      .catch((err) => console.error('[bookings PATCH] calendar sync', err)),
  );

  const reviewInvite = {
    attempted: false,
    sent: false,
    reason: null as string | null,
  };

  if (status === 'completed') {
    const booking = updated[0] as Record<string, unknown>;
    const clientEmail = String(booking.client_email ?? '').trim();
    const googlePlaceId = String((resolved.salon as Record<string, unknown>).google_place_id ?? '').trim();

    const inviteLock = await sql`
      UPDATE bookings
      SET google_review_invite_sent_at = now()
      WHERE id = ${bookingId}
        AND salon_id = ${salonId}
        AND google_review_invite_sent_at IS NULL
      RETURNING id
    `;

    reviewInvite.attempted = true;

    if (inviteLock.length === 0) {
      reviewInvite.reason = 'already_sent';
    } else if (!clientEmail) {
      reviewInvite.reason = 'missing_client_email';
    } else if (!googlePlaceId) {
      reviewInvite.reason = 'missing_google_place_id';
    } else {
      try {
        await sendGoogleReviewInvitation(
          clientEmail,
          String(booking.client_name ?? ''),
          resolved.salon.name,
          googlePlaceId,
          resolved.salon.slug
        );
        reviewInvite.sent = true;
      } catch (err) {
        console.error('[bookings PATCH] review invite send failed', err);
        reviewInvite.reason = 'send_failed';
      }
    }
  }

  return NextResponse.json({ success: true, reviewInvite });
}
