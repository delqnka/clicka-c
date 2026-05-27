import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureBookingsSchema } from '@/lib/ensure-bookings-schema';
import { sendBookingNotification, sendBookingConfirmation, sendGoogleReviewInvitation } from '@/lib/resend';
import { sendBookingTelegram } from '@/lib/telegram';
import { requireAdminRequestAccess, resolveSalonBySlugOrHost } from '@/lib/admin-auth';

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

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
           telegram_chat_id, google_place_id
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
  } = body;
  const normalizedNotes = typeof notes === 'string' ? notes.trim() : '';


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

  const bookingId = crypto.randomUUID();
  const priceValue =
    servicePrice != null && Number.isFinite(Number(servicePrice)) ? Number(servicePrice) : null;
  const durationValue =
    serviceDuration != null && Number.isFinite(Number(serviceDuration))
      ? Math.round(Number(serviceDuration))
      : null;

  let bookings: { id: string }[];
  try {
    bookings = (await sql`
      INSERT INTO bookings (
        id, salon_id, client_name, client_phone, client_email,
        service_name, service_price, service_duration,
        date, time, status, notes
      )
      VALUES (
        ${bookingId},
        ${String((resolved.salon as Record<string, unknown>).salon_id ?? '')},
        ${clientName}, ${clientPhone}, ${normalizedClientEmail},
        ${serviceName}, ${priceValue}, ${durationValue},
        ${date}, ${time}, 'pending', ${normalizedNotes}
      )
      RETURNING id
    `) as { id: string }[];
  } catch (err) {
    console.error('[bookings POST]', err);
    return NextResponse.json(
      { error: 'Резервацията не можа да бъде записана. Моля опитайте отново.' },
      { status: 500 }
    );
  }

  if (!bookings[0]?.id) {
    return NextResponse.json(
      { error: 'Резервацията не можа да бъде записана. Моля опитайте отново.' },
      { status: 500 }
    );
  }

  const bookingDetails = {
    clientName,
    clientPhone,
    clientEmail: normalizedClientEmail,
    serviceName,
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

  const notifPromises: Promise<void>[] = [];

  if (resolved.salon.email) {
    notifPromises.push(sendBookingNotification(resolved.salon.email, bookingDetails));
  }

  notifPromises.push(sendBookingConfirmation(normalizedClientEmail, bookingDetails));

  const telegramChatId = String((resolved.salon as Record<string, unknown>).telegram_chat_id ?? '').trim();
  if (telegramChatId) {
    notifPromises.push(
      sendBookingTelegram(telegramChatId, {
        ...bookingDetails,
        clientEmail: normalizedClientEmail,
      })
    );
  }

  await Promise.allSettled(notifPromises);

  return NextResponse.json({
    success: true,
    bookingId: bookings[0].id,
    message: `Резервацията е потвърдена за ${date} в ${time}. Очакваме ви!`,
  });
}

export async function PATCH(request: NextRequest) {
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
    RETURNING id, client_email, client_name, service_name
  `;

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Резервацията не е намерена' }, { status: 404 });
  }

  if (status === 'completed') {
    const booking = updated[0] as Record<string, unknown>;
    const clientEmail = String(booking.client_email ?? '').trim();
    const googlePlaceId = String((resolved.salon as Record<string, unknown>).google_place_id ?? '').trim();

    if (clientEmail && googlePlaceId) {
      void sendGoogleReviewInvitation(
        clientEmail,
        String(booking.client_name ?? ''),
        resolved.salon.name,
        googlePlaceId
      ).catch(() => {});
    }
  }

  return NextResponse.json({ success: true });
}
