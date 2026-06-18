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
import { normalizeServices } from '@/lib/salon-services';
import { isDateBlockedAllDay, isBlockedForStartTime, normalizeBookingBlocks } from '@/lib/booking-blocks';
import { runAfterResponse } from '@/lib/run-after-response';
import {
  cancelBookingSmsReminders,
  scheduleBookingSmsReminders,
} from '@/lib/sms-reminders';
import { sendGoogleReviewInvitation } from '@/lib/resend';
import { loadExternalCalendarEventsForRange } from '@/lib/calendar-external-events';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getStaffMemberById } from '@/lib/staff-members';

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

// CORS for public endpoints — allows BookingWidget from separate client repos.
const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

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
           owner_name, telegram_chat_id, google_place_id, opening_hours,
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
    // Rate limit public slot checks — 30 requests per minute per IP to stop enumeration
    const ip = getClientIp(request as unknown as Request);
    const rl = await checkRateLimit('bookings-public', ip, 30, 60 * 1000);
    if (rl.limited) {
      return NextResponse.json({ error: 'Твърде много заявки.' }, { status: 429, headers: PUBLIC_CORS });
    }

    const resolved = await resolveSalonFromRequest(request);
    if ('error' in resolved) return resolved.error;
    const salonId = String((resolved.salon as Record<string, unknown>).salon_id ?? '');
    const date = String(requestSearchParams.get('date') ?? '').trim();
    if (!date) return NextResponse.json({ occupied: [] });
    const legacyDate = formatLegacyDateDMY(date);
    // For TEAM salons the widget passes staffMemberId so slots are scoped per staff.
    const staffMemberId = requestSearchParams.get('staffMemberId')?.trim() || null;
    const occupiedRows = await sql`
      SELECT time, service_duration, status
      FROM bookings
      WHERE salon_id = ${salonId}
        AND date IN (${date}, ${legacyDate ?? date})
        AND NOT (
          payment_status IN ('pending', 'unpaid')
          AND created_at < now() - interval '5 minutes'
        )
        AND (${staffMemberId}::uuid IS NULL OR staff_member_id = ${staffMemberId}::uuid)
      ORDER BY time ASC
    `;
    const occupied: { time: string; duration: number }[] = occupiedRows
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

    const externalEvents = await loadExternalCalendarEventsForRange(salonId, date, date).catch(() => []);
    for (const ev of externalEvents) {
      if (ev.allDay) continue;
      const startMins = parseTimeToMinutes(ev.startTime);
      const endMins = parseTimeToMinutes(ev.endTime);
      if (startMins == null || endMins == null) continue;
      const duration = Math.max(5, endMins - startMins);
      occupied.push({ time: ev.startTime, duration });
    }

    return NextResponse.json({ occupied }, { headers: PUBLIC_CORS });
  }

  const auth = await requireAdminRequestAccess(request, requestSearchParams.get('slug'));
  if (!auth.ok) return auth.response;

  const resolved = await resolveSalonFromRequest(request);
  if ('error' in resolved) return resolved.error;

  const status = requestSearchParams.get('status') as BookingStatus | null;
  const limitRaw = requestSearchParams.get('limit');
  const limit = Math.min(Math.max(Number(limitRaw ?? '50') || 50, 1), 200);
  const before = requestSearchParams.get('before'); // cursor: YYYY-MM-DD

  if (status && !['pending', 'confirmed', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Невалиден статус' }, { status: 400 });
  }

  const salonId = String((resolved.salon as Record<string, unknown>).salon_id ?? '');

  const rows = status
    ? before
      ? await sql`
          SELECT id, client_name, client_phone, client_email,
            service_name, service_price, service_duration,
            date, time, status, notes, created_at
          FROM bookings
          WHERE salon_id = ${salonId} AND status = ${status} AND date < ${before}
          ORDER BY date DESC, time DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT id, client_name, client_phone, client_email,
            service_name, service_price, service_duration,
            date, time, status, notes, created_at
          FROM bookings
          WHERE salon_id = ${salonId} AND status = ${status}
          ORDER BY date DESC, time DESC
          LIMIT ${limit}
        `
    : before
      ? await sql`
          SELECT id, client_name, client_phone, client_email,
            service_name, service_price, service_duration,
            date, time, status, notes, created_at
          FROM bookings
          WHERE salon_id = ${salonId} AND date < ${before}
          ORDER BY date DESC, time DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT id, client_name, client_phone, client_email,
            service_name, service_price, service_duration,
            date, time, status, notes, created_at
          FROM bookings
          WHERE salon_id = ${salonId}
          ORDER BY date DESC, time DESC
          LIMIT ${limit}
        `;

  const nextCursor = rows.length === limit
    ? String((rows[rows.length - 1] as Record<string, unknown>).date ?? '')
    : null;

  return NextResponse.json({ bookings: rows, nextCursor });
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
    requiresPayment?: boolean;
    staffMemberId?: string;
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
    requiresPayment,
    staffMemberId: rawStaffMemberId,
  } = body;
  const staffMemberId = rawStaffMemberId?.trim() || null;
  const normalizedNotes = typeof notes === 'string' ? notes.trim() : '';
  const hasSmsReminderConsent = smsReminderConsent === true;
  const normalizedOfferId = typeof offerId === 'string' ? offerId.trim() : '';
  const skipNotifications = requiresPayment === true;

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

  const externalEvents = await loadExternalCalendarEventsForRange(salonId, date, date).catch(() => []);
  const bookingDuration = durationValue ?? 30;
  const bookingStart = parseTimeToMinutes(time) ?? 0;
  const bookingEnd = bookingStart + bookingDuration;
  for (const ev of externalEvents) {
    if (ev.allDay) continue;
    const evStart = parseTimeToMinutes(ev.startTime);
    const evEnd = parseTimeToMinutes(ev.endTime);
    if (evStart == null || evEnd == null) continue;
    if (bookingStart < evEnd && bookingEnd > evStart) {
      return NextResponse.json(
        { error: 'Този час е зает от друг ангажимент. Моля изберете друг свободен час.' },
        { status: 409 },
      );
    }
  }

  // Determine booking status: check if the matched service requires manual confirmation
  const salonServicesRaw = await sql`SELECT services FROM salons WHERE CAST(id AS text) = ${salonId} LIMIT 1`;
  const salonServices = normalizeServices((salonServicesRaw[0] as Record<string, unknown> | undefined)?.services ?? []);
  const matchedService = salonServices.find(
    (s) => s.name.toLowerCase() === resolvedServiceName.toLowerCase() ||
           resolvedServiceName.toLowerCase().includes(s.name.toLowerCase()),
  );
  const bookingStatus = matchedService?.requires_confirmation === true ? 'pending' : 'confirmed';

  let insertedBooking: { id: string; manageToken: string } | null = null;
  try {
    insertedBooking = await insertBookingIfNoOverlap({
      id: bookingId,
      salonId,
      staffMemberId,
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
      status: bookingStatus,
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
    const legacyDate = formatLegacyDateDMY(date);
    const conflicting = await sql`
      SELECT id, date, time, service_duration, status, client_name
      FROM bookings
      WHERE salon_id = ${salonId}
        AND date IN (${date}, ${legacyDate ?? date})
        AND lower(trim(coalesce(status, ''))) NOT IN ('cancelled', 'canceled', 'отказана', 'анулирана')
      ORDER BY time
    `;
    console.error('[bookings POST] overlap rejection', {
      requestedDate: date,
      requestedTime: time,
      requestedDuration: durationValue ?? 30,
      salonId,
      conflictingBookings: conflicting.map((r: Record<string, unknown>) => ({
        id: r.id, date: r.date, time: r.time, duration: r.service_duration, status: r.status,
      })),
    });
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
    manageToken: insertedBooking.manageToken,
    clientName,
    clientPhone,
    clientEmail: normalizedClientEmail,
    serviceName: resolvedServiceName,
    servicePrice,
    serviceDuration,
    date,
    time,
    notes: normalizedNotes || undefined,
    bookingStatus: bookingStatus as 'pending' | 'confirmed',
    salonName: resolved.salon.name,
    salonOwnerName: resolved.salon.owner_name ? String(resolved.salon.owner_name) : undefined,
    salonEmail: resolved.salon.email || undefined,
    salonPhone: resolved.salon.phone || undefined,
    salonAddress:
      [resolved.salon.address, resolved.salon.city]
        .map(value => String(value ?? '').trim())
        .filter(Boolean)
        .join(', ') || undefined,
  };

  const telegramChatId = String((resolved.salon as Record<string, unknown>).telegram_chat_id ?? '').trim();

  if (!skipNotifications) {
    // Load staff member contacts so notifications route to the right person.
    const staffMember = staffMemberId ? await getStaffMemberById(staffMemberId).catch(() => null) : null;

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
        staffEmail: staffMember?.email ?? null,
        staffTelegramChatId: staffMember?.telegramChatId ?? null,
        staffName: staffMember?.name ?? null,
      }),
    );
  }

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

  return NextResponse.json({
    success: true,
    bookingId: insertedBooking.id,
    message: `Резервацията е потвърдена за ${formatBgDateDMY(date)} в ${time}. Очакваме ви!`,
  }, { headers: PUBLIC_CORS });
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
              service_duration, date, time, notes, status
  `;

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Резервацията не е намерена' }, { status: 404 });
  }

  if (status === 'cancelled') {
    void cancelBookingSmsReminders(bookingId).catch((err) =>
      console.error('[bookings PATCH] cancel SMS', err),
    );
  }

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

// ── PUT /api/bookings — reschedule (change date/time) ────────────────────────
export async function PUT(request: NextRequest) {
  try {
    await ensureBookingsSchema();
  } catch (err) {
    console.error('[bookings PUT] schema', err);
    return NextResponse.json({ error: 'Резервационната система не е налична.' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const auth = await requireAdminRequestAccess(request, searchParams.get('slug'));
  if (!auth.ok) return auth.response;

  const resolved = await resolveSalonFromRequest(request);
  if ('error' in resolved) return resolved.error;

  let body: { bookingId?: string; newDate?: string; newTime?: string; oldDate?: string; oldTime?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const { bookingId, newDate, newTime, oldDate, oldTime } = body;
  if (!bookingId || !newDate || !newTime) {
    return NextResponse.json({ error: 'Липсват bookingId, newDate или newTime' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || !/^\d{2}:\d{2}$/.test(newTime)) {
    return NextResponse.json({ error: 'Невалиден формат на дата или час' }, { status: 400 });
  }

  const salonId = String((resolved.salon as Record<string, unknown>).salon_id ?? '');

  const updated = await sql`
    UPDATE bookings
    SET date = ${newDate}, time = ${newTime}
    WHERE CAST(id AS text) = ${bookingId}
      AND salon_id = ${salonId}
      AND status NOT IN ('cancelled', 'completed')
    RETURNING CAST(id AS text) AS id, date, time, client_name, service_name
  ` as { id: string; date: string; time: string; client_name: string; service_name: string }[];

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Резервацията не е намерена или не може да се промени' }, { status: 404 });
  }

  const row = updated[0]!;

  if (oldDate && oldTime) {
    const { onBookingRescheduled } = await import('@/lib/booking-reschedule');
    void onBookingRescheduled({
      bookingId: row.id,
      salonId,
      oldDate,
      oldTime,
      newDate,
      newTime,
    }).catch((err) => console.error('[bookings PUT] onBookingRescheduled', err));
  }

  return NextResponse.json({ success: true, booking: { id: row.id, date: row.date, time: row.time } });
}
