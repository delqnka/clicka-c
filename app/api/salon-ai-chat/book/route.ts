import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sql } from '@/lib/db';
import { insertBookingIfNoOverlap } from '@/lib/booking-insert';
import { dispatchBookingNotifications } from '@/lib/booking-notifications';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      salonId: string;
      staffName: string;
      serviceName: string;
      date: string; // YYYY-MM-DD
      time: string; // HH:MM
      clientName: string;
      clientPhone: string;
    };

    const { salonId, staffName, serviceName, date, time, clientName, clientPhone } = body;

    if (!salonId || !staffName || !serviceName || !date || !time || !clientName || !clientPhone) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Load salon and verify team plan
    const salonRows = await sql`
      SELECT CAST(id AS text) AS id, name, plan, email, telegram_chat_id,
             services, working_hours
      FROM salons
      WHERE CAST(id AS text) = ${salonId} AND is_active = true
      LIMIT 1
    ` as Record<string, unknown>[];

    if (salonRows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const salon = salonRows[0]!;
    if (String(salon.plan ?? '') !== 'team') {
      return NextResponse.json({ error: 'Plan not supported' }, { status: 403 });
    }

    // Find staff member by name (case-insensitive)
    const staffRows = await sql`
      SELECT id, name, role, email, telegram_chat_id
      FROM staff_members
      WHERE salon_id = ${salonId}
        AND is_active = true
        AND lower(trim(name)) = lower(trim(${staffName}))
      LIMIT 1
    ` as { id: string; name: string; role?: string; email?: string; telegram_chat_id?: string }[];

    if (staffRows.length === 0) {
      return NextResponse.json({ error: 'Staff not found', staffName }, { status: 404 });
    }

    const staff = staffRows[0]!;

    // Resolve service duration from salon.services json
    let serviceDuration = 60;
    let servicePrice: number | null = null;
    try {
      const services = Array.isArray(salon.services)
        ? salon.services
        : (typeof salon.services === 'string' ? JSON.parse(salon.services) : []) as Record<string, unknown>[];
      const match = services.find(
        (s) => String(s.name ?? '').toLowerCase().trim() === serviceName.toLowerCase().trim(),
      );
      if (match) {
        if (match.duration_min) serviceDuration = Number(match.duration_min);
        if (match.price) servicePrice = Number(match.price);
      }
    } catch { /* use defaults */ }

    const bookingId = crypto.randomUUID();

    const result = await insertBookingIfNoOverlap({
      id: bookingId,
      salonId,
      staffMemberId: staff.id,
      clientName,
      clientPhone,
      clientEmail: '',
      serviceName,
      servicePrice,
      serviceDuration,
      date,
      time,
      notes: 'Записан през AI чат',
      smsReminderConsent: false,
      offerId: null,
      status: 'pending',
    });

    if (!result) {
      return NextResponse.json({ error: 'Slot taken' }, { status: 409 });
    }

    // Fire-and-forget notifications
    dispatchBookingNotifications({
      salonEmail: String(salon.email ?? ''),
      clientEmail: '',
      telegramChatId: String(salon.telegram_chat_id ?? ''),
      staffEmail: staff.email ?? null,
      staffTelegramChatId: staff.telegram_chat_id ?? null,
      bookingDetails: {
        salonName: String(salon.name ?? ''),
        clientName,
        clientEmail: '',
        clientPhone,
        serviceName,
        servicePrice: servicePrice ?? undefined,
        date,
        time,
        notes: `Майстор: ${staff.name} | Записан през AI чат`,
      },
      telegramDetails: {
        salonName: String(salon.name ?? ''),
        clientName,
        clientPhone,
        serviceName,
        date,
        time,
        notes: `Майстор: ${staff.name} | Записан през AI чат`,
      },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      bookingId: result.id,
      staffName: staff.name,
      date,
      time,
      serviceName,
    });
  } catch (e) {
    console.error('[salon-ai-chat/book]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
