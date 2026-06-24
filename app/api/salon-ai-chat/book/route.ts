import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sql } from '@/lib/db';
import { insertBookingIfNoOverlap } from '@/lib/booking-insert';
import { dispatchBookingNotifications } from '@/lib/booking-notifications';
import { runAfterResponse } from '@/lib/run-after-response';
import { upsertSalonClient } from '@/lib/salon-clients';

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
      clientEmail?: string;
    };

    const { salonId, staffName, serviceName, date, time, clientName, clientPhone, clientEmail } = body;

    console.log('[AI BOOK]', { salonId, serviceName, date, time, clientName, hasPhone: !!clientPhone, hasEmail: !!clientEmail });

    if (!salonId || !serviceName || !date || !time || !clientName || !clientPhone) {
      console.error('[AI BOOK] missing fields', { salonId: !!salonId, serviceName: !!serviceName, date: !!date, time: !!time, clientName: !!clientName, clientPhone: !!clientPhone });
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Load salon
    const salonRows = await sql`
      SELECT CAST(id AS text) AS id, name, owner_name, plan, email, telegram_chat_id,
             services, working_hours
      FROM salons
      WHERE CAST(id AS text) = ${salonId} AND is_active = true
      LIMIT 1
    ` as Record<string, unknown>[];

    if (salonRows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const salon = salonRows[0]!;

    // Normalize date — AI may generate DD.MM.YYYY or DD/MM/YYYY instead of YYYY-MM-DD
    const normalizeDate = (raw: string): string => {
      const dmyMatch = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
      if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]!.padStart(2, '0')}-${dmyMatch[1]!.padStart(2, '0')}`;
      return raw;
    };
    const normalizedDate = normalizeDate(date);

    // Find staff member by name when the AI specified one.
    let staff: { id: string; name: string; role?: string; email?: string; telegram_chat_id?: string } | null = null;
    if (staffName) {
      const staffRows = await sql`
        SELECT id, name, role, email, telegram_chat_id
        FROM staff_members
        WHERE salon_id = ${salonId}
          AND is_active = true
          AND lower(trim(name)) = lower(trim(${staffName}))
        LIMIT 1
      ` as { id: string; name: string; role?: string; email?: string; telegram_chat_id?: string }[];

      if (staffRows.length === 0) {
        // Fuzzy fallback — partial name match (AI may generate slightly different spelling)
        const fuzzyRows = await sql`
          SELECT id, name, role, email, telegram_chat_id
          FROM staff_members
          WHERE salon_id = ${salonId}
            AND is_active = true
            AND lower(name) LIKE ${`%${staffName.toLowerCase().slice(0, 6)}%`}
          LIMIT 1
        ` as { id: string; name: string; role?: string; email?: string; telegram_chat_id?: string }[];
        staff = fuzzyRows[0] ?? null;
      } else {
        staff = staffRows[0]!;
      }
    }

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
      staffMemberId: staff?.id ?? null,
      clientName,
      clientPhone,
      clientEmail: clientEmail ?? '',
      serviceName,
      servicePrice,
      serviceDuration,
      date: normalizedDate,
      time,
      notes: 'Записан през AI чат',
      offerId: null,
      status: 'confirmed',
    });

    if (!result) {
      return NextResponse.json({ error: 'Slot taken' }, { status: 409 });
    }

    runAfterResponse(upsertSalonClient(salonId, clientName, {
      phone: clientPhone,
      email: clientEmail ?? undefined,
    }));

    const notesLine = staff ? `Майстор: ${staff.name} | Записан през AI чат` : 'Записан през AI чат';

    runAfterResponse(dispatchBookingNotifications({
      salonId,
      salonEmail: String(salon.email ?? ''),
      clientEmail: clientEmail ?? '',
      telegramChatId: String(salon.telegram_chat_id ?? ''),
      staffEmail: staff?.email ?? null,
      staffTelegramChatId: staff?.telegram_chat_id ?? null,
      staffName: staff?.name ?? null,
      bookingDetails: {
        salonName: String(salon.name ?? ''),
        salonOwnerName: salon.owner_name ? String(salon.owner_name) : undefined,
        language: salon.language ? String(salon.language) : undefined,
        clientName,
        clientEmail: '',
        clientPhone,
        serviceName,
        servicePrice: servicePrice ?? undefined,
        date: normalizedDate,
        time,
        notes: notesLine,
      },
      telegramDetails: {
        salonName: String(salon.name ?? ''),
        language: salon.language ? String(salon.language) : undefined,
        clientName,
        clientPhone,
        serviceName,
        date: normalizedDate,
        time,
        notes: notesLine,
      },
    }));

    return NextResponse.json({
      ok: true,
      bookingId: result.id,
      staffName: staff?.name ?? null,
      date: normalizedDate,
      time,
      serviceName,
    });
  } catch (e) {
    console.error('[salon-ai-chat/book]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
