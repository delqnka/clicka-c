import { sql } from '@/lib/db';
import { ensureSmsSchema } from '@/lib/ensure-sms-schema';
import { sendSmsReminder } from '@/lib/smsapi';
import {
  normalizeSmsReminderMode,
  parseSofiaAppointment,
  type SmsReminderMode,
} from '@/lib/sms-shared';

type ReminderKind = '24h' | '1h';

function reminderKindsForMode(mode: SmsReminderMode): { kind: ReminderKind; hoursBefore: number }[] {
  if (mode === '1h') return [{ kind: '1h', hoursBefore: 1 }];
  if (mode === '24h_and_1h') {
    return [
      { kind: '24h', hoursBefore: 24 },
      { kind: '1h', hoursBefore: 1 },
    ];
  }
  return [];
}

export async function scheduleBookingSmsReminders(opts: {
  salonId: string;
  bookingId: string;
  date: string;
  time: string;
  smsEnabled: boolean;
  smsReminderMode: unknown;
}) {
  await ensureSmsSchema();

  const mode = normalizeSmsReminderMode(opts.smsReminderMode);
  if (!opts.smsEnabled || mode === 'off') {
    await cancelBookingSmsReminders(opts.bookingId);
    return;
  }

  const appointment = parseSofiaAppointment(opts.date, opts.time);
  const now = Date.now();

  await sql`
    DELETE FROM booking_sms_reminders
    WHERE booking_id = ${opts.bookingId} AND status = 'pending'
  `;

  for (const { kind, hoursBefore } of reminderKindsForMode(mode)) {
    const sendAt = new Date(appointment.getTime() - hoursBefore * 60 * 60 * 1000);
    if (sendAt.getTime() <= now) continue;

    await sql`
      INSERT INTO booking_sms_reminders (salon_id, booking_id, kind, send_at, status)
      VALUES (
        ${opts.salonId},
        ${opts.bookingId},
        ${kind},
        ${sendAt.toISOString()},
        'pending'
      )
      ON CONFLICT (booking_id, kind) DO UPDATE SET
        send_at = EXCLUDED.send_at,
        status = 'pending',
        sent_at = NULL,
        error_message = NULL
    `;
  }
}

export async function cancelBookingSmsReminders(bookingId: string) {
  await ensureSmsSchema();
  await sql`
    UPDATE booking_sms_reminders
    SET status = 'cancelled'
    WHERE booking_id = ${bookingId} AND status = 'pending'
  `;
}

async function logSmsTransaction(opts: {
  salonId: string;
  kind: string;
  delta: number;
  balanceAfter: number | null;
  bookingId?: string;
  reminderId?: string;
  clientPhone?: string;
  stripeSessionId?: string;
  note?: string;
}) {
  await sql`
    INSERT INTO sms_transactions (
      salon_id, kind, delta, balance_after, booking_id, reminder_id,
      client_phone, stripe_session_id, note
    )
    VALUES (
      ${opts.salonId},
      ${opts.kind},
      ${opts.delta},
      ${opts.balanceAfter},
      ${opts.bookingId ?? null},
      ${opts.reminderId ?? null},
      ${opts.clientPhone ?? null},
      ${opts.stripeSessionId ?? null},
      ${opts.note ?? null}
    )
  `;
}

export async function creditSmsPack(opts: {
  salonId: string;
  credits: number;
  stripeSessionId: string;
}) {
  await ensureSmsSchema();

  const existing = await sql`
    SELECT id FROM sms_transactions
    WHERE stripe_session_id = ${opts.stripeSessionId}
    LIMIT 1
  `;
  if (existing.length > 0) return;

  const updated = await sql`
    UPDATE salons
    SET sms_balance = sms_balance + ${opts.credits}
    WHERE id::text = ${opts.salonId}
    RETURNING sms_balance
  `;

  if (updated.length === 0) return;

  await logSmsTransaction({
    salonId: opts.salonId,
    kind: 'purchase',
    delta: opts.credits,
    balanceAfter: Number((updated[0] as Record<string, unknown>).sms_balance ?? 0),
    stripeSessionId: opts.stripeSessionId,
    note: `Пакет ${opts.credits} SMS`,
  });
}

export async function processDueSmsReminders(limit = 40): Promise<{ processed: number; sent: number }> {
  await ensureSmsSchema();

  const due = await sql`
    SELECT
      r.id AS reminder_id,
      r.salon_id,
      r.booking_id,
      r.kind,
      b.client_name,
      b.client_phone,
      b.service_name,
      b.date,
      b.time,
      b.status AS booking_status,
      s.name AS salon_name,
      s.phone AS salon_phone,
      s.sms_balance,
      s.sms_enabled,
      s.sms_reminder_mode
    FROM booking_sms_reminders r
    INNER JOIN bookings b ON b.id = r.booking_id
    INNER JOIN salons s ON s.id::text = r.salon_id
    WHERE r.status = 'pending' AND r.send_at <= now()
    ORDER BY r.send_at ASC
    LIMIT ${limit}
  `;

  let sent = 0;

  for (const row of due as Record<string, unknown>[]) {
    const reminderId = String(row.reminder_id);
    const salonId = String(row.salon_id);
    const bookingId = String(row.booking_id);
    const bookingStatus = String(row.booking_status ?? '');
    const enabled = row.sms_enabled === true;
    const mode = normalizeSmsReminderMode(row.sms_reminder_mode);
    const balance = Number(row.sms_balance ?? 0);

    if (!enabled || mode === 'off') {
      await sql`
        UPDATE booking_sms_reminders
        SET status = 'skipped_disabled', error_message = 'SMS известията са изключени'
        WHERE id = ${reminderId}::uuid
      `;
      continue;
    }

    if (!['pending', 'confirmed'].includes(bookingStatus)) {
      await sql`
        UPDATE booking_sms_reminders
        SET status = 'cancelled', error_message = 'Резервацията не е активна'
        WHERE id = ${reminderId}::uuid
      `;
      continue;
    }

    if (balance <= 0) {
      await sql`
        UPDATE booking_sms_reminders
        SET status = 'skipped_no_balance', error_message = 'Няма налични SMS кредити'
        WHERE id = ${reminderId}::uuid
      `;
      await logSmsTransaction({
        salonId,
        kind: 'skip',
        delta: 0,
        balanceAfter: 0,
        bookingId,
        reminderId,
        clientPhone: String(row.client_phone ?? ''),
        note: `Пропуснато (${row.kind}) — 0 баланс`,
      });
      continue;
    }

    const phone = String(row.client_phone ?? '').trim();
    if (!phone) {
      await sql`
        UPDATE booking_sms_reminders
        SET status = 'failed', error_message = 'Липсва телефон'
        WHERE id = ${reminderId}::uuid
      `;
      continue;
    }

    const result = await sendSmsReminder(
      phone,
      String(row.client_name ?? 'Клиент'),
      String(row.salon_name ?? 'Салон'),
      String(row.salon_phone ?? ''),
      String(row.service_name ?? 'услуга'),
      String(row.date ?? ''),
      String(row.time ?? ''),
    );

    if (!result.success) {
      await sql`
        UPDATE booking_sms_reminders
        SET status = 'failed', error_message = ${result.error ?? 'Грешка при изпращане'}
        WHERE id = ${reminderId}::uuid
      `;
      continue;
    }

    const debited = await sql`
      UPDATE salons
      SET sms_balance = sms_balance - 1
      WHERE id::text = ${salonId} AND sms_balance > 0
      RETURNING sms_balance
    `;

    if (debited.length === 0) {
      await sql`
        UPDATE booking_sms_reminders
        SET status = 'skipped_no_balance', error_message = 'Няма налични SMS кредити'
        WHERE id = ${reminderId}::uuid
      `;
      continue;
    }

    const balanceAfter = Number((debited[0] as Record<string, unknown>).sms_balance ?? 0);

    await sql`
      UPDATE booking_sms_reminders
      SET status = 'sent', sent_at = now(), error_message = NULL
      WHERE id = ${reminderId}::uuid
    `;

    await logSmsTransaction({
      salonId,
      kind: 'send',
      delta: -1,
      balanceAfter,
      bookingId,
      reminderId,
      clientPhone: phone,
      note: `Напомняне ${String(row.kind)}`,
    });

    sent += 1;
  }

  return { processed: due.length, sent };
}
