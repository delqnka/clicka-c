import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureBookingsSchema } from '@/lib/ensure-bookings-schema';
import { isCancelledStatus, bookingStartMinutesFromTimeString, formatLegacyDateDMY } from '@/lib/booking-time';
import { sendTelegramMessage } from '@/lib/telegram';
import { runAfterResponse } from '@/lib/run-after-response';
import { cancelBookingSmsReminders } from '@/lib/sms-reminders';
import { stripe } from '@/lib/stripe';
import { parseSalonServices } from '@/lib/salon-services';
import {
  evaluateCancellationPolicy,
  formatPolicySummary,
  type CancelPolicyAction,
} from '@/lib/cancellation-policy';

export const dynamic = 'force-dynamic';

function formatBgDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' });
}

type BookingRow = {
  id: string;
  salon_id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  service_name: string;
  service_price: number | null;
  service_duration: number | null;
  date: string;
  time: string;
  status: string;
  notes: string | null;
  manage_token: string | null;
  staff_member_id: string | null;
  payment_status: string;
  amount_paid: number | null;
  stripe_checkout_session_id: string | null;
};

async function loadBookingByToken(
  bookingId: string,
  token: string,
): Promise<{
  booking: BookingRow;
  salonName: string;
  salonSlug: string;
  telegramChatId: string;
  stripeAccountId: string | null;
  servicesJson: unknown;
} | null> {
  await ensureBookingsSchema();

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const rows = await sql`
    SELECT
      b.id, b.salon_id, b.client_name, b.client_phone, b.client_email,
      b.service_name, b.service_price, b.service_duration,
      b.date, b.time, b.status, b.notes, b.manage_token, b.staff_member_id,
      b.payment_status, b.amount_paid, b.stripe_checkout_session_id,
      s.name AS salon_name, s.slug AS salon_slug, s.telegram_chat_id,
      s.stripe_account_id, s.services AS services_json
    FROM bookings b
    JOIN salons s ON CAST(s.id AS text) = b.salon_id
    WHERE b.id = ${bookingId}
      AND (b.manage_token = ${tokenHash} OR b.manage_token = ${token})
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0] as BookingRow & {
    salon_name: string;
    salon_slug: string;
    telegram_chat_id: string | null;
    stripe_account_id: string | null;
    services_json: unknown;
  };
  return {
    booking: row,
    salonName: String(row.salon_name ?? ''),
    salonSlug: String(row.salon_slug ?? ''),
    telegramChatId: String(row.telegram_chat_id ?? '').trim(),
    stripeAccountId: row.stripe_account_id ?? null,
    servicesJson: row.services_json,
  };
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') ?? '';
  const token = request.nextUrl.searchParams.get('token') ?? '';

  if (!id || !token) {
    return NextResponse.json({ error: 'Липсват параметри.' }, { status: 400 });
  }

  const result = await loadBookingByToken(id, token);
  if (!result) {
    return NextResponse.json({ error: 'Резервацията не е намерена.' }, { status: 404 });
  }

  const { booking, salonName, servicesJson } = result;

  // Resolve cancellation policy for this service
  const services = parseSalonServices(servicesJson);
  const matchedService = services.find(
    (s) => s.name.trim().toLowerCase() === booking.service_name.trim().toLowerCase(),
  );
  const cancelPolicyHours = matchedService?.cancel_policy_hours ?? 24;
  const cancelPolicyAction: CancelPolicyAction =
    (matchedService?.cancel_policy_action as CancelPolicyAction | undefined) ?? 'keep_deposit';
  const hasCancelPolicy =
    (booking.payment_status === 'paid') &&
    (matchedService?.payment_type === 'deposit' || matchedService?.payment_type === 'full');

  return NextResponse.json({
    id: booking.id,
    clientName: booking.client_name,
    serviceName: booking.service_name,
    servicePrice: booking.service_price,
    serviceDuration: booking.service_duration,
    date: booking.date,
    time: booking.time,
    status: booking.status,
    salonName,
    canModify: !isCancelledStatus(booking.status) && booking.status !== 'completed',
    cancelPolicy: hasCancelPolicy
      ? {
          summary: formatPolicySummary({
            cancelPolicyHours,
            cancelPolicyAction,
            depositAmountEuros: matchedService?.deposit_amount,
          }),
          policyHours: cancelPolicyHours,
          policyAction: cancelPolicyAction,
          amountPaidEuros: booking.amount_paid ? booking.amount_paid / 100 : 0,
        }
      : null,
  });
}

export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') ?? '';
  const token = request.nextUrl.searchParams.get('token') ?? '';

  if (!id || !token) {
    return NextResponse.json({ error: 'Липсват параметри.' }, { status: 400 });
  }

  let body: { action: string; newDate?: string; newTime?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const result = await loadBookingByToken(id, token);
  if (!result) {
    return NextResponse.json({ error: 'Резервацията не е намерена.' }, { status: 404 });
  }

  const { booking, salonName, telegramChatId, stripeAccountId, servicesJson } = result;

  if (isCancelledStatus(booking.status) || booking.status === 'completed') {
    return NextResponse.json({ error: 'Резервацията не може да бъде променена.' }, { status: 400 });
  }

  if (body.action === 'cancel') {
    // Evaluate cancellation policy and issue Stripe refund if applicable
    let refundMessage: string | null = null;

    if (booking.payment_status === 'paid' && booking.amount_paid && booking.stripe_checkout_session_id && stripeAccountId) {
      const services = parseSalonServices(servicesJson);
      const matchedService = services.find(
        (s) => s.name.trim().toLowerCase() === booking.service_name.trim().toLowerCase(),
      );

      const cancelPolicyHours = matchedService?.cancel_policy_hours ?? 24;
      const cancelPolicyAction: CancelPolicyAction =
        (matchedService?.cancel_policy_action as CancelPolicyAction | undefined) ?? 'keep_deposit';

      const bookingDatetime = new Date(`${booking.date}T${booking.time}:00`);
      const policy = evaluateCancellationPolicy({
        bookingDatetime,
        amountPaidCents: booking.amount_paid,
        depositAmountEuros: matchedService?.deposit_amount,
        cancelPolicyHours,
        cancelPolicyAction,
      });

      if (policy.refundCents > 0) {
        try {
          // Retrieve payment intent from checkout session (on the connected account)
          const session = await stripe.checkout.sessions.retrieve(
            booking.stripe_checkout_session_id,
            { expand: ['payment_intent'] },
            { stripeAccount: stripeAccountId },
          );
          const paymentIntentId =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : (session.payment_intent as { id: string } | null)?.id;

          if (paymentIntentId) {
            await stripe.refunds.create(
              { payment_intent: paymentIntentId, amount: policy.refundCents },
              { stripeAccount: stripeAccountId },
            );
            await sql`
              UPDATE bookings SET payment_status = 'refunded' WHERE id = ${id}
            `;
          }
        } catch (err) {
          console.error('[manage] stripe refund failed:', err);
        }
      }

      refundMessage = policy.policyMessage;
    }

    await sql`
      UPDATE bookings SET status = 'cancelled' WHERE id = ${id}
    `;

    void cancelBookingSmsReminders(id).catch((err) =>
      console.error('[manage] cancel SMS', err),
    );

    if (telegramChatId) {
      runAfterResponse(
        sendTelegramMessage(
          telegramChatId,
          [
            `❌ <b>Отказана резервация</b>`,
            `👤 ${booking.client_name}`,
            `✂️ ${booking.service_name}`,
            `🗓 ${formatBgDate(booking.date)} в ${booking.time}`,
            '',
            'Клиентът отказа резервацията си.',
          ].join('\n'),
        ).catch((err) => console.error('[manage] telegram notify', err)),
      );
    }

    return NextResponse.json({ success: true, status: 'cancelled', refundMessage });
  }

  if (body.action === 'reschedule') {
    const { newDate, newTime } = body;
    if (!newDate || !newTime || !/^\d{4}-\d{2}-\d{2}$/.test(newDate) || !/^\d{2}:\d{2}$/.test(newTime)) {
      return NextResponse.json({ error: 'Невалидна дата или час.' }, { status: 400 });
    }

    const newDatetime = new Date(`${newDate}T${newTime}:00`);
    if (Number.isNaN(newDatetime.getTime()) || newDatetime.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Изберете бъдеща дата и час.' }, { status: 400 });
    }

    const oldDate = booking.date;
    const oldTime = booking.time;
    const legacyNewDate = formatLegacyDateDMY(newDate) ?? newDate;
    const requestedStart = bookingStartMinutesFromTimeString(newTime);
    const requestedEnd = requestedStart + Math.max(5, booking.service_duration || 30);
    const staffMemberId = booking.staff_member_id ?? null;

    const updated = await sql`
      UPDATE bookings
      SET date = ${newDate}, time = ${newTime}
      WHERE id = ${id}
        AND status NOT IN ('cancelled', 'completed')
        AND NOT EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.salon_id = ${booking.salon_id}
            AND CAST(b.id AS text) <> CAST(${id} AS text)
            AND b.date IN (${newDate}, ${legacyNewDate})
            AND lower(trim(coalesce(b.status, ''))) NOT IN (
              'cancelled', 'canceled', 'отказана', 'анулирана'
            )
            AND (
              ${staffMemberId}::uuid IS NULL
              OR b.staff_member_id = ${staffMemberId}::uuid
              OR b.staff_member_id IS NULL
            )
            AND (
              (
                COALESCE(NULLIF(split_part(trim(b.time), ':', 1), '')::int, 0) * 60
                + COALESCE(NULLIF(split_part(trim(b.time), ':', 2), '')::int, 0)
              ) < ${requestedEnd}
              AND (
                (
                  COALESCE(NULLIF(split_part(trim(b.time), ':', 1), '')::int, 0) * 60
                  + COALESCE(NULLIF(split_part(trim(b.time), ':', 2), '')::int, 0)
                ) + GREATEST(5, COALESCE(b.service_duration, 30))
              ) > ${requestedStart}
            )
        )
      RETURNING id
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Избраният час вече е зает. Моля, изберете друг.' }, { status: 409 });
    }

    void cancelBookingSmsReminders(id).catch((err) =>
      console.error('[manage] reschedule cancel SMS', err),
    );

    const { onBookingRescheduled } = await import('@/lib/booking-reschedule');
    runAfterResponse(
      onBookingRescheduled({
        bookingId: id,
        salonId: booking.salon_id,
        oldDate,
        oldTime,
        newDate,
        newTime,
      }).catch((err) => console.error('[manage] onBookingRescheduled', err)),
    );

    if (telegramChatId) {
      runAfterResponse(
        sendTelegramMessage(
          telegramChatId,
          [
            `🔄 <b>Преместена резервация</b>`,
            `👤 ${booking.client_name}`,
            `✂️ ${booking.service_name}`,
            `🗓 Стара: ${formatBgDate(oldDate)} в ${oldTime}`,
            `🗓 Нова: ${formatBgDate(newDate)} в ${newTime}`,
            '',
            'Клиентът премести часа си.',
          ].join('\n'),
        ).catch((err) => console.error('[manage] telegram notify', err)),
      );
    }

    return NextResponse.json({ success: true, status: booking.status, date: newDate, time: newTime });
  }

  return NextResponse.json({ error: 'Невалидно действие.' }, { status: 400 });
}
