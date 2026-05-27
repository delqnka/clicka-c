import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { ensureSmsSchema } from '@/lib/ensure-sms-schema';
import {
  SMS_PACK_CREDITS,
  SMS_PACK_PRICE_EUR,
  normalizeSmsReminderMode,
  smsCreditsPerBooking,
  type SmsReminderMode,
} from '@/lib/sms-shared';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  await ensureSmsSchema();

  const salonRows = await sql`
    SELECT
      CAST(id AS text) AS salon_id,
      sms_balance,
      sms_enabled,
      sms_reminder_mode
    FROM salons
    WHERE slug = ${auth.salon.slug}
    LIMIT 1
  `;

  if (salonRows.length === 0) {
    return NextResponse.json({ error: 'Салонът не е намерен.' }, { status: 404 });
  }

  const salon = salonRows[0] as Record<string, unknown>;
  const salonId = String(salon.salon_id);
  const reminderMode = normalizeSmsReminderMode(salon.sms_reminder_mode);

  const transactions = await sql`
    SELECT id, kind, delta, balance_after, note, client_phone, created_at
    FROM sms_transactions
    WHERE salon_id = ${salonId}
    ORDER BY created_at DESC
    LIMIT 30
  `;

  const pending = await sql`
    SELECT COUNT(*)::int AS count
    FROM booking_sms_reminders
    WHERE salon_id = ${salonId} AND status = 'pending'
  `;

  return NextResponse.json({
    balance: Number(salon.sms_balance ?? 0),
    enabled: salon.sms_enabled === true,
    reminderMode,
    creditsPerBooking: smsCreditsPerBooking(reminderMode),
    pendingReminders: Number((pending[0] as Record<string, unknown>)?.count ?? 0),
    packCredits: SMS_PACK_CREDITS,
    packPriceEur: SMS_PACK_PRICE_EUR,
    transactions,
  });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: { enabled?: boolean; reminderMode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  await ensureSmsSchema();

  const currentRows = await sql`
    SELECT sms_enabled, sms_reminder_mode
    FROM salons
    WHERE slug = ${auth.salon.slug}
    LIMIT 1
  `;
  if (currentRows.length === 0) {
    return NextResponse.json({ error: 'Салонът не е намерен.' }, { status: 404 });
  }

  const current = currentRows[0] as Record<string, unknown>;
  const enabled =
    typeof body.enabled === 'boolean' ? body.enabled : current.sms_enabled === true;
  const reminderMode: SmsReminderMode =
    body.reminderMode != null
      ? normalizeSmsReminderMode(body.reminderMode)
      : normalizeSmsReminderMode(current.sms_reminder_mode);

  if (enabled && reminderMode === 'off') {
    return NextResponse.json(
      { error: 'Избери режим на напомняния (1 час или 24ч + 1ч), преди да включиш SMS.' },
      { status: 400 },
    );
  }

  const effectiveEnabled = enabled && reminderMode !== 'off';

  await sql`
    UPDATE salons
    SET
      sms_enabled = ${effectiveEnabled},
      sms_reminder_mode = ${reminderMode}
    WHERE slug = ${auth.salon.slug}
  `;

  return NextResponse.json({
    success: true,
    enabled: effectiveEnabled,
    reminderMode,
    creditsPerBooking: smsCreditsPerBooking(reminderMode),
  });
}
