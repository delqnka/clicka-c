import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendBookingNotification, sendBookingConfirmation } from '@/lib/resend';
import { requireAdminRequestAccess, resolveSalonBySlugOrHost } from '@/lib/admin-auth';

type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

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
    SELECT CAST(id AS text) AS salon_id, name, email, slug, phone, city, address FROM salons
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

  if (!clientName || !clientPhone || !serviceName || !date || !time) {
    return NextResponse.json(
      { error: 'Моля попълнете всички задължителни полета' },
      { status: 400 }
    );
  }

  const bookings = await sql`
    INSERT INTO bookings (
      salon_id, client_name, client_phone, client_email,
      service_name, service_price, service_duration,
      date, time, status, notes
    )
    VALUES (
      ${String((resolved.salon as Record<string, unknown>).salon_id ?? '')}, ${clientName}, ${clientPhone}, ${clientEmail ?? null},
      ${serviceName}, ${servicePrice ?? null}, ${serviceDuration ?? null},
      ${date}, ${time}, 'pending', ${notes ?? null}
    )
    RETURNING id
  `;

  const bookingDetails = {
    clientName,
    clientPhone,
    clientEmail,
    serviceName,
    servicePrice,
    serviceDuration,
    date,
    time,
    notes,
    salonName: resolved.salon.name,
    salonEmail: resolved.salon.email || undefined,
    salonPhone: resolved.salon.phone || undefined,
    salonAddress:
      [resolved.salon.address, resolved.salon.city]
        .map(value => String(value ?? '').trim())
        .filter(Boolean)
        .join(', ') || undefined,
  };

  const emailPromises: Promise<void>[] = [];

  if (resolved.salon.email) {
    emailPromises.push(sendBookingNotification(resolved.salon.email, bookingDetails));
  }

  if (clientEmail) {
    emailPromises.push(sendBookingConfirmation(clientEmail, bookingDetails));
  }

  await Promise.allSettled(emailPromises);

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
  if (!status || !['pending', 'confirmed', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Невалиден статус' }, { status: 400 });
  }

  const updated = await sql`
    UPDATE bookings
    SET status = ${status}
    WHERE id = ${bookingId} AND salon_id = ${String((resolved.salon as Record<string, unknown>).salon_id ?? '')}
    RETURNING id
  `;

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Резервацията не е намерена' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
