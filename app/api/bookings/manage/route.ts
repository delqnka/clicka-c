import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureBookingsSchema } from '@/lib/ensure-bookings-schema';
import { isCancelledStatus, bookingStartMinutesFromTimeString, formatLegacyDateDMY, parseTimeToMinutes } from '@/lib/booking-time';
import {
  normalizeClassSchedule,
  getClassSlotsForDate,
  getClassSlotsForDateWithOverrides,
  normalizeTrainerName,
  type BookingClassSlot,
} from '@/lib/class-schedule';
import { listClassScheduleOverrides } from '@/lib/class-schedule-overrides';
import { getStaffMembers } from '@/lib/staff-members';
import { sendTelegramMessage } from '@/lib/telegram';
import { runAfterResponse } from '@/lib/run-after-response';
import { sendBookingCancellationEmails } from '@/lib/booking-cancellation-notifications';
import { getStaffMemberById } from '@/lib/staff-members';
import { stripe } from '@/lib/stripe';
import { parseSalonServices } from '@/lib/salon-services';
import {
  evaluateResetBodyCancellationPolicy,
  evaluateCancellationPolicy,
  formatPolicySummary,
  formatResetBodyCancellationPolicySummary,
  shouldUseResetBodyCancellationPolicy,
  type CancelPolicyAction,
} from '@/lib/cancellation-policy';
import { restorePackageCreditForBooking } from '@/lib/client-packages';
import { parseSofiaAppointment } from '@/lib/sofia-time';

export const dynamic = 'force-dynamic';

function formatBgDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' });
}

function resolveLanguageCode(language?: string | null): 'bg' | 'en' {
  return String(language ?? '').trim().toLowerCase().startsWith('en') ? 'en' : 'bg';
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
  booking_quantity: number | null;
};

async function loadBookingByToken(
  bookingId: string,
  token: string,
): Promise<{
  booking: BookingRow;
  salonName: string;
  salonSlug: string;
  salonEmail: string | null;
  salonOwnerName: string | null;
  language: string | null;
  telegramChatId: string;
  stripeAccountId: string | null;
  servicesJson: unknown;
  openingHours: unknown;
} | null> {
  await ensureBookingsSchema();

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const rows = await sql`
    SELECT
      b.id, b.salon_id, b.client_name, b.client_phone, b.client_email,
      b.service_name, b.service_price, b.service_duration,
      b.date, b.time, b.status, b.notes, b.manage_token, b.staff_member_id,
      b.payment_status, b.amount_paid, b.stripe_checkout_session_id, b.booking_quantity,
      s.name AS salon_name, s.slug AS salon_slug, s.telegram_chat_id,
      s.email AS salon_email, s.owner_name AS salon_owner_name, s.language,
      s.stripe_account_id, s.services AS services_json, s.opening_hours AS opening_hours
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
    salon_email: string | null;
    salon_owner_name: string | null;
    language: string | null;
    telegram_chat_id: string | null;
    stripe_account_id: string | null;
    services_json: unknown;
    opening_hours: unknown;
  };
  return {
    booking: row,
    salonName: String(row.salon_name ?? ''),
    salonSlug: String(row.salon_slug ?? ''),
    salonEmail: row.salon_email ? String(row.salon_email) : null,
    salonOwnerName: row.salon_owner_name ? String(row.salon_owner_name) : null,
    language: row.language ? String(row.language) : null,
    telegramChatId: String(row.telegram_chat_id ?? '').trim(),
    stripeAccountId: row.stripe_account_id ?? null,
    servicesJson: row.services_json,
    openingHours: row.opening_hours,
  };
}

/**
 * Resolve the active class timetable for a salon on a given date (recurring
 * schedule + one-off overrides). Returns an empty array when the salon is not
 * class-based for that day, in which case free time selection is allowed.
 */
async function resolveClassSlotsForDate(
  salonId: string,
  openingHours: unknown,
  date: string,
): Promise<BookingClassSlot[]> {
  const classSchedule = normalizeClassSchedule(
    openingHours && typeof openingHours === 'object'
      ? (openingHours as Record<string, unknown>).class_schedule
      : null,
  );
  if (Object.keys(classSchedule).length === 0) return [];
  const overrides = await listClassScheduleOverrides(salonId, date, date).catch(() => []);
  const effective = overrides.length > 0
    ? { [String(new Date(`${date}T12:00:00`).getDay())]: getClassSlotsForDateWithOverrides(classSchedule, date, overrides) }
    : classSchedule;
  return getClassSlotsForDate(effective, date);
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

  const { booking, salonName, servicesJson, openingHours } = result;

  // When a `date` query param is present the client is asking which class slots
  // are bookable on that day (used by the reschedule picker). For class-based
  // salons we return the active timetable with remaining capacity; for free-slot
  // salons we return `classBased: false` so the UI falls back to free time entry.
  const slotsDate = request.nextUrl.searchParams.get('date');
  if (slotsDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(slotsDate)) {
      return NextResponse.json({ error: 'Невалидна дата.' }, { status: 400 });
    }
    const classSlots = await resolveClassSlotsForDate(booking.salon_id, openingHours, slotsDate);
    if (classSlots.length === 0) {
      return NextResponse.json({ date: slotsDate, classBased: false, slots: [] });
    }

    const staff = await getStaffMembers(booking.salon_id).catch(() => []);
    const legacyDate = formatLegacyDateDMY(slotsDate) ?? slotsDate;
    const activeBookings = await sql`
      SELECT time, service_duration, booking_quantity, staff_member_id
      FROM bookings
      WHERE salon_id = ${booking.salon_id}
        AND date IN (${slotsDate}, ${legacyDate})
        AND CAST(id AS text) <> CAST(${booking.id} AS text)
        AND lower(trim(coalesce(status, ''))) NOT IN ('cancelled', 'canceled', 'отказана', 'анулирана')
    ` as Array<{ time: string; service_duration: number | null; booking_quantity: number | null; staff_member_id: string | null }>;

    const slots = classSlots.map((slot) => {
      const trainerStaff = staff.find((m) => normalizeTrainerName(m.name) === normalizeTrainerName(slot.trainer));
      const used = activeBookings.reduce((sum, row) => {
        if ((parseTimeToMinutes(row.time) ?? -1) !== (parseTimeToMinutes(slot.start) ?? -2)) return sum;
        // A booking belongs to this slot's class when it shares the trainer, or
        // when either side is unassigned (legacy / solo bookings).
        const sameTrainer =
          !trainerStaff ||
          row.staff_member_id == null ||
          String(row.staff_member_id) === String(trainerStaff.id);
        if (!sameTrainer) return sum;
        return sum + Math.max(1, Number(row.booking_quantity ?? 1) || 1);
      }, 0);
      const spotsLeft = Math.max(0, slot.capacity - used);
      return {
        time: slot.start,
        end: slot.end,
        className: slot.className ?? '',
        trainer: slot.trainer,
        capacity: slot.capacity,
        spotsLeft,
        available: spotsLeft > 0,
      };
    });

    return NextResponse.json({ date: slotsDate, classBased: true, slots });
  }

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
  const useResetBodyPolicy = shouldUseResetBodyCancellationPolicy({
    salonName,
    salonSlug: result.salonSlug,
  });

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
          summary: useResetBodyPolicy
            ? formatResetBodyCancellationPolicySummary(resolveLanguageCode(result.language))
            : formatPolicySummary({
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

  let body: { action: string; newDate?: string; newTime?: string; newTrainer?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const result = await loadBookingByToken(id, token);
  if (!result) {
    return NextResponse.json({ error: 'Резервацията не е намерена.' }, { status: 404 });
  }

  const { booking, salonName, salonEmail, salonOwnerName, telegramChatId, stripeAccountId, servicesJson, language, openingHours } = result;

  if (isCancelledStatus(booking.status) || booking.status === 'completed') {
    return NextResponse.json({ error: 'Резервацията не може да бъде променена.' }, { status: 400 });
  }

  if (body.action === 'cancel') {
    // Evaluate cancellation policy and issue Stripe refund if applicable
    let refundMessage: string | null = null;
    let clientPolicyMessage: string | null = null;
    const bookingDatetime = parseSofiaAppointment(booking.date, booking.time);
    const useResetBodyPolicy = shouldUseResetBodyCancellationPolicy({ salonName, salonSlug: result.salonSlug });
    const resetBodyPolicy = useResetBodyPolicy
      ? evaluateResetBodyCancellationPolicy({
          bookingDatetime,
          amountPaidCents: booking.amount_paid ?? 0,
        })
      : null;

    if (booking.payment_status === 'paid' && booking.amount_paid && booking.stripe_checkout_session_id && stripeAccountId) {
      const services = parseSalonServices(servicesJson);
      const matchedService = services.find(
        (s) => s.name.trim().toLowerCase() === booking.service_name.trim().toLowerCase(),
      );

      const cancelPolicyHours = matchedService?.cancel_policy_hours ?? 24;
      const cancelPolicyAction: CancelPolicyAction =
        (matchedService?.cancel_policy_action as CancelPolicyAction | undefined) ?? 'keep_deposit';

      const policy = resetBodyPolicy ?? evaluateCancellationPolicy({
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

    const shouldRestorePackageCredit = resetBodyPolicy
      ? resetBodyPolicy.creditShouldBeRestored
      : ((bookingDatetime.getTime() - Date.now()) / (1000 * 60 * 60)) >= 12;

    if (shouldRestorePackageCredit) {
      const restored = await restorePackageCreditForBooking({
        salonId: booking.salon_id,
        bookingId: booking.id,
      }).catch((err) => {
        console.error('[manage] package credit restore failed:', err);
        return null;
      });
      clientPolicyMessage = resetBodyPolicy
        ? resetBodyPolicy.creditMessage(restored ? {
            packageName: restored.packageName,
            remainingSessions: restored.remainingSessions,
            expiresAt: restored.expiresAt,
          } : undefined)
        : (restored
            ? `Отказът е направен повече от 12 часа преди часа. Кредитът е върнат към пакета „${restored.packageName}“. Остават ${restored.remainingSessions} кредита, валидни до ${restored.expiresAt}.`
            : 'Отказът е направен повече от 12 часа преди часа. Няма наказание.');
    } else {
      clientPolicyMessage = resetBodyPolicy?.creditMessage()
        ?? 'Отказът е направен по-малко от 12 часа преди часа. Ако резервацията е била покрита от пакет, 1 кредит остава използван. Ако няма активен пакет, при следващо посещение се начислява такса 50% от цената на отказания час.';
      await sql`
        UPDATE bookings
        SET notes = trim(coalesce(notes, '') || E'\n' || ${resetBodyPolicy
          ? '[Политика при отказ] Късна отмяна според правилата на Reset Body Lab: ако резервацията е с пакет, един кредит остава използван; при платена резервация сумата не се възстановява.'
          : '[Политика при отказ] Отказ под 12 часа: ако клиентът няма активен пакет, при следващо посещение се дължи 50% от цената на отказания час.'})
        WHERE id = ${id}
      `;
    }

    await sql`
      UPDATE bookings SET status = 'cancelled' WHERE id = ${id}
    `;

    const staffMember = booking.staff_member_id
      ? await getStaffMemberById(booking.staff_member_id).catch(() => null)
      : null;
    const notifyTelegram = (staffMember?.telegramChatId || null) ?? telegramChatId;
    runAfterResponse(
      sendBookingCancellationEmails({
        salonId: booking.salon_id,
        salonName,
        salonEmail,
        salonOwnerName: salonOwnerName ?? undefined,
        staffMemberId: booking.staff_member_id,
        clientName: booking.client_name,
        clientPhone: booking.client_phone,
        clientEmail: booking.client_email ?? undefined,
        serviceName: booking.service_name,
        date: booking.date,
        time: booking.time,
        refundMessage,
        clientPolicyMessage,
        language,
      }).catch((err) => console.error('[manage] cancellation email notify', err)),
    );

    if (notifyTelegram) {
      runAfterResponse(
        sendTelegramMessage(
          notifyTelegram,
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

    // For class-based salons the new time must match an active class on that day,
    // exactly like a fresh booking does. This closes the gap where the manage
    // page let clients pick any arbitrary time of the day.
    const classSlots = await resolveClassSlotsForDate(booking.salon_id, openingHours, newDate);
    let newStaffMemberId = booking.staff_member_id ?? null;
    let newDuration = Math.max(5, booking.service_duration || 30);
    let slotCapacity = 1;

    if (classSlots.length > 0) {
      const requestedTrainer = normalizeTrainerName(body.newTrainer);
      const matchingSlots = classSlots.filter((slot) => slot.start === newTime);
      const classSlot = requestedTrainer
        ? matchingSlots.find((slot) => normalizeTrainerName(slot.trainer) === requestedTrainer)
        : matchingSlots[0];
      if (!classSlot) {
        return NextResponse.json(
          { error: 'Избраният час не е част от активния график. Моля изберете час от графика.' },
          { status: 400 },
        );
      }
      const staff = await getStaffMembers(booking.salon_id).catch(() => []);
      const matchedStaff = staff.find(
        (member) => normalizeTrainerName(member.name) === normalizeTrainerName(classSlot.trainer),
      );
      if (matchedStaff) newStaffMemberId = matchedStaff.id;
      const slotDuration = (parseTimeToMinutes(classSlot.end) ?? 0) - (parseTimeToMinutes(classSlot.start) ?? 0);
      if (slotDuration > 0) newDuration = Math.max(5, slotDuration);
      slotCapacity = Math.max(1, classSlot.capacity);
    }

    const requestedStart = bookingStartMinutesFromTimeString(newTime);
    const requestedEnd = requestedStart + newDuration;
    const staffMemberId = newStaffMemberId;
    const bookingQuantity = Math.max(1, Number(booking.booking_quantity ?? 1) || 1);

    // Capacity-aware availability: a class with N places stays bookable until
    // the booked quantity reaches N. For free-slot salons slotCapacity is 1, so
    // any overlapping booking still blocks the move exactly as before.
    const updated = await sql`
      UPDATE bookings
      SET date = ${newDate}, time = ${newTime}, staff_member_id = ${staffMemberId}::uuid, service_duration = ${newDuration}
      WHERE id = ${id}
        AND status NOT IN ('cancelled', 'completed')
        AND (
          SELECT COALESCE(SUM(GREATEST(1, COALESCE(b.booking_quantity, 1))), 0)
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
        ) + ${bookingQuantity} <= ${slotCapacity}
      RETURNING id
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Избраният час вече е зает. Моля, изберете друг.' }, { status: 409 });
    }

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
