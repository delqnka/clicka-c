import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';
import { ensureSalonClientsSchema } from '@/lib/ensure-salon-clients-schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get('x-cron-secret') === secret;
}

function offsetDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateBg(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSalonClientsSchema();

  const nowHour = new Date().getHours();
  const nowMinute = new Date().getMinutes();
  // Hour-before: target bookings within the next 60-70 minutes
  const targetHour = `${String(nowHour + 1).padStart(2, '0')}:${String(nowMinute).padStart(2, '0')}`;
  const today = offsetDays(0);
  const tomorrow = offsetDays(1);

  let dayCount = 0;
  let hourCount = 0;

  // ── Day-before reminders ──────────────────────────────────────────────────
  const dayRows = await sql`
    SELECT
      b.client_name, b.date, b.time, b.service_name,
      sc.notes,
      s.telegram_chat_id,
      sm.telegram_chat_id AS staff_chat_id
    FROM bookings b
    JOIN salon_clients sc
      ON CAST(b.salon_id AS text) = sc.salon_id
      AND lower(b.client_name) = lower(sc.name)
    JOIN salons s ON CAST(s.id AS text) = CAST(b.salon_id AS text)
    LEFT JOIN staff_members sm
      ON sm.salon_id = CAST(b.salon_id AS text)
      AND sm.is_owner = true
      AND sm.telegram_chat_id IS NOT NULL
    WHERE b.date = ${tomorrow}
      AND b.status NOT IN ('cancelled', 'completed')
      AND sc.remind_day_before = true
      AND sc.notes IS NOT NULL
  ` as { client_name: string; date: string; time: string; service_name: string; notes: string; telegram_chat_id: string | null; staff_chat_id: string | null }[];

  for (const r of dayRows) {
    const chatId = r.staff_chat_id ?? r.telegram_chat_id;
    if (!chatId) continue;
    await sendTelegramMessage(
      Number(chatId),
      `🗒 <b>Напомняне за утре</b>\n\n👤 <b>${r.client_name}</b> — ${formatDateBg(r.date)} в ${r.time.slice(0, 5)} (${r.service_name})\n\n📝 <i>${r.notes}</i>`,
    );
    dayCount++;
  }

  // ── Hour-before reminders ─────────────────────────────────────────────────
  const hourRows = await sql`
    SELECT
      b.client_name, b.date, b.time, b.service_name,
      sc.notes,
      s.telegram_chat_id,
      sm.telegram_chat_id AS staff_chat_id
    FROM bookings b
    JOIN salon_clients sc
      ON CAST(b.salon_id AS text) = sc.salon_id
      AND lower(b.client_name) = lower(sc.name)
    JOIN salons s ON CAST(s.id AS text) = CAST(b.salon_id AS text)
    LEFT JOIN staff_members sm
      ON sm.salon_id = CAST(b.salon_id AS text)
      AND sm.is_owner = true
      AND sm.telegram_chat_id IS NOT NULL
    WHERE b.date = ${today}
      AND b.time >= ${targetHour}
      AND b.time < ${`${String(nowHour + 1).padStart(2, '0')}:59`}
      AND b.status NOT IN ('cancelled', 'completed')
      AND sc.remind_hour_before = true
      AND sc.notes IS NOT NULL
  ` as { client_name: string; date: string; time: string; service_name: string; notes: string; telegram_chat_id: string | null; staff_chat_id: string | null }[];

  for (const r of hourRows) {
    const chatId = r.staff_chat_id ?? r.telegram_chat_id;
    if (!chatId) continue;
    await sendTelegramMessage(
      Number(chatId),
      `⏰ <b>Напомняне — след ~1 час</b>\n\n👤 <b>${r.client_name}</b> в ${r.time.slice(0, 5)} (${r.service_name})\n\n📝 <i>${r.notes}</i>`,
    );
    hourCount++;
  }

  return NextResponse.json({ ok: true, dayReminders: dayCount, hourReminders: hourCount });
}
