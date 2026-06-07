import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureBookingsSchema } from '@/lib/ensure-bookings-schema';
import { insertBookingIfNoOverlap } from '@/lib/booking-insert';
import { dispatchBookingNotifications } from '@/lib/booking-notifications';
import { isCancelledStatus } from '@/lib/booking-time';
import { getStaffMemberByPortalToken, updateStaffMember } from '@/lib/staff-members';
import { normalizeServices } from '@/lib/salon-services';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { runAfterResponse } from '@/lib/run-after-response';

export const dynamic = 'force-dynamic';

async function resolveStaffByToken(token: string) {
  const staff = await getStaffMemberByPortalToken(token);
  if (!staff || !staff.isActive) return null;
  const salons = await sql`
    SELECT CAST(id AS text) AS salon_id, name, slug, email, phone, city, address,
           owner_name, telegram_chat_id, services
    FROM salons
    WHERE CAST(id AS text) = ${staff.salonId} AND is_active = true
    LIMIT 1
  `;
  if (salons.length === 0) return null;
  return { staff, salon: salons[0] as Record<string, unknown> };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim() || '';
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Невалиден линк' }, { status: 404 });
  }

  const ip = getClientIp(request as unknown as Request);
  const rl = await checkRateLimit('staff-portal-get', ip, 30, 60 * 1000);
  if (rl.limited) {
    return NextResponse.json({ error: 'Твърде много заявки.' }, { status: 429 });
  }

  const resolved = await resolveStaffByToken(token);
  if (!resolved) {
    return NextResponse.json({ error: 'Невалиден или изтекъл линк' }, { status: 404 });
  }
  const { staff, salon } = resolved;

  const rows = await sql`
    SELECT id, client_name, client_phone, service_name, service_duration,
           date, time, status, notes
    FROM bookings
    WHERE salon_id = ${staff.salonId}
      AND staff_member_id = ${staff.id}::uuid
      AND date >= (current_date - interval '14 days')::text
    ORDER BY date ASC, time ASC
    LIMIT 300
  `;

  const bookings = rows
    .map((raw) => {
      const r = raw as Record<string, unknown>;
      return {
        id: String(r.id),
        clientName: String(r.client_name ?? ''),
        clientPhone: String(r.client_phone ?? ''),
        serviceName: String(r.service_name ?? ''),
        serviceDuration: r.service_duration != null ? Number(r.service_duration) : null,
        date: String(r.date ?? ''),
        time: String(r.time ?? ''),
        status: String(r.status ?? ''),
        notes: r.notes ? String(r.notes) : null,
      };
    })
    .filter((b) => !isCancelledStatus(b.status));

  const allServices = normalizeServices(salon.services ?? []);
  const services = staff.serviceIds.length > 0
    ? allServices.filter((s) => s.id && staff.serviceIds.includes(s.id))
    : allServices;

  return NextResponse.json({
    staff: { id: staff.id, name: staff.name, slug: staff.slug, bio: staff.bio, avatarUrl: staff.avatarUrl },
    salon: { name: String(salon.name ?? ''), slug: String(salon.slug ?? '') },
    services: services.map((s) => ({ id: s.id, name: s.name, price: s.price, durationMin: s.duration_min })),
    bookings,
  });
}

export async function POST(request: NextRequest) {
  try {
    await ensureBookingsSchema();
  } catch (err) {
    console.error('[staff-portal POST] schema', err);
    return NextResponse.json({ error: 'Системата не е налична. Моля опитайте по-късно.' }, { status: 503 });
  }

  const ip = getClientIp(request as unknown as Request);
  const rl = await checkRateLimit('staff-portal-post', ip, 15, 60 * 1000);
  if (rl.limited) {
    return NextResponse.json({ error: 'Твърде много заявки.' }, { status: 429 });
  }

  let body: {
    token?: string;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    serviceName?: string;
    servicePrice?: number | null;
    serviceDuration?: number;
    date?: string;
    time?: string;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const token = body.token?.trim() || '';
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Невалиден линк' }, { status: 404 });
  }

  const resolved = await resolveStaffByToken(token);
  if (!resolved) {
    return NextResponse.json({ error: 'Невалиден или изтекъл линк' }, { status: 404 });
  }
  const { staff, salon } = resolved;

  const clientName = body.clientName?.trim() || '';
  const clientPhone = body.clientPhone?.trim() || '';
  const clientEmail = (body.clientEmail?.trim() || '').toLowerCase();
  const serviceName = body.serviceName?.trim() || '';
  const date = body.date?.trim() || '';
  const time = body.time?.trim() || '';
  const notes = body.notes?.trim() || '';

  if (!clientName || !clientPhone || !clientEmail || !serviceName || !date || !time) {
    return NextResponse.json({ error: 'Моля попълнете всички задължителни полета' }, { status: 400 });
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(clientEmail)) {
    return NextResponse.json({ error: 'Моля, въведете валиден имейл адрес.' }, { status: 400 });
  }

  const priceValue = body.servicePrice != null && Number.isFinite(Number(body.servicePrice))
    ? Number(body.servicePrice)
    : null;
  const durationValue = body.serviceDuration != null && Number.isFinite(Number(body.serviceDuration))
    ? Math.max(5, Math.round(Number(body.serviceDuration)))
    : 30;

  const salonId = staff.salonId;
  const bookingId = crypto.randomUUID();

  let inserted: { id: string; manageToken: string } | null = null;
  try {
    inserted = await insertBookingIfNoOverlap({
      id: bookingId,
      salonId,
      staffMemberId: staff.id,
      clientName,
      clientPhone,
      clientEmail,
      serviceName,
      servicePrice: priceValue,
      serviceDuration: durationValue,
      date,
      time,
      notes,
      smsReminderConsent: false,
      offerId: null,
      status: 'confirmed',
    });
  } catch (err) {
    const dbErr = err as { code?: string } | null;
    if (dbErr?.code === '23505') {
      return NextResponse.json({ error: 'Този час току-що беше зает. Моля изберете друг.' }, { status: 409 });
    }
    console.error('[staff-portal POST]', err);
    return NextResponse.json({ error: 'Резервацията не можа да бъде записана.' }, { status: 500 });
  }

  if (!inserted) {
    return NextResponse.json({ error: 'Този час току-що беше зает. Моля изберете друг.' }, { status: 409 });
  }

  const bookingDetails = {
    bookingId: inserted.id,
    manageToken: inserted.manageToken,
    clientName,
    clientPhone,
    clientEmail,
    serviceName,
    servicePrice: priceValue,
    serviceDuration: durationValue,
    date,
    time,
    notes: notes || undefined,
    salonName: String(salon.name ?? ''),
    salonOwnerName: salon.owner_name ? String(salon.owner_name) : undefined,
    salonEmail: salon.email ? String(salon.email) : undefined,
    salonPhone: salon.phone ? String(salon.phone) : undefined,
    salonAddress: [salon.address, salon.city].map((v) => String(v ?? '').trim()).filter(Boolean).join(', ') || undefined,
  };

  const telegramChatId = String(salon.telegram_chat_id ?? '').trim();

  runAfterResponse(
    dispatchBookingNotifications({
      salonEmail: salon.email ? String(salon.email) : null,
      clientEmail,
      telegramChatId,
      bookingDetails,
      telegramDetails: { ...bookingDetails, clientEmail },
      staffEmail: staff.email,
      staffTelegramChatId: staff.telegramChatId,
      staffName: staff.name,
    }),
  );

  return NextResponse.json({ success: true, bookingId: inserted.id });
}

export async function PATCH(request: NextRequest) {
  const ip = getClientIp(request as unknown as Request);
  const rl = await checkRateLimit('staff-portal-patch', ip, 15, 60 * 1000);
  if (rl.limited) {
    return NextResponse.json({ error: 'Твърде много заявки.' }, { status: 429 });
  }

  let body: { token?: string; bio?: string | null; avatarUrl?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const token = body.token?.trim() || '';
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Невалиден линк' }, { status: 404 });
  }

  const resolved = await resolveStaffByToken(token);
  if (!resolved) {
    return NextResponse.json({ error: 'Невалиден или изтекъл линк' }, { status: 404 });
  }
  const { staff } = resolved;

  await updateStaffMember(staff.id, staff.salonId, {
    bio: body.bio !== undefined ? body.bio : undefined,
    avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : undefined,
  });

  return NextResponse.json({ ok: true });
}
