import type Stripe from 'stripe';
import { sql } from '@/lib/db';
import { dispatchBookingNotifications } from '@/lib/booking-notifications';
import { getStaffMemberById } from '@/lib/staff-members';

export async function confirmPaidBookingFromStripeSession(
  session: Stripe.Checkout.Session,
  options: { logLabel: string },
): Promise<{ bookingId: string | null; updated: boolean }> {
  const bookingId = session.metadata?.bookingId ?? null;
  if (!bookingId) return { bookingId: null, updated: false };

  const updated = await sql`
    UPDATE bookings SET
      status         = 'confirmed',
      payment_status = 'paid',
      amount_paid    = ${session.amount_total ?? 0}
    WHERE id = ${bookingId}
      AND payment_status != 'paid'
    RETURNING id
  ` as unknown as { id: string }[];

  if (updated.length === 0) {
    console.log(`[${options.logLabel}] booking already paid, skipping notifications — id=${bookingId}`);
    return { bookingId, updated: false };
  }

  const rows = await sql`
    SELECT
      b.id, b.client_name, b.client_phone, b.client_email,
      b.service_name, b.service_price, b.service_duration, b.booking_quantity,
      b.date, b.time, b.notes, b.manage_token, b.staff_member_id,
      CAST(s.id AS text) AS salon_id,
      s.name AS salon_name, s.owner_name AS salon_owner_name, s.email AS salon_email,
      s.phone AS salon_phone, s.address AS salon_address,
      s.city AS salon_city,
      s.telegram_chat_id
    FROM bookings b
    JOIN salons s ON s.id = b.salon_id
    WHERE b.id = ${bookingId}
    LIMIT 1
  `.catch(() => []);

  if (rows.length > 0) {
    const row = rows[0] as Record<string, unknown>;
    const amountPaidEuros = session.amount_total != null ? session.amount_total / 100 : undefined;
    const bookingDetails = {
      bookingId: String(row.id ?? ''),
      manageToken: String(row.manage_token ?? ''),
      clientName: String(row.client_name ?? ''),
      clientPhone: String(row.client_phone ?? ''),
      clientEmail: String(row.client_email ?? ''),
      serviceName: String(row.service_name ?? ''),
      servicePrice: row.service_price != null ? Number(row.service_price) : undefined,
      serviceDuration: row.service_duration != null ? Number(row.service_duration) : undefined,
      bookingQuantity: row.booking_quantity != null ? Number(row.booking_quantity) : undefined,
      date: String(row.date ?? ''),
      time: String(row.time ?? ''),
      notes: row.notes ? String(row.notes) : undefined,
      bookingStatus: 'confirmed' as const,
      salonName: String(row.salon_name ?? ''),
      salonOwnerName: row.salon_owner_name ? String(row.salon_owner_name) : undefined,
      salonEmail: row.salon_email ? String(row.salon_email) : undefined,
      salonPhone: row.salon_phone ? String(row.salon_phone) : undefined,
      salonAddress:
        [row.salon_address, row.salon_city]
          .map((v) => String(v ?? '').trim())
          .filter(Boolean)
          .join(', ') || undefined,
      amountPaid: amountPaidEuros,
      paymentType: session.metadata?.paymentType ?? undefined,
    };
    const clientEmail = String(row.client_email ?? '').trim();
    const salonEmail = row.salon_email ? String(row.salon_email).trim() : null;
    const telegramChatId = row.telegram_chat_id ? String(row.telegram_chat_id).trim() : null;
    const staffMemberId = row.staff_member_id ? String(row.staff_member_id) : null;
    const staffMember = staffMemberId ? await getStaffMemberById(staffMemberId).catch(() => null) : null;

    await dispatchBookingNotifications({
      salonId: String(row.salon_id ?? '') || undefined,
      salonEmail,
      clientEmail,
      telegramChatId,
      bookingDetails,
      telegramDetails: { ...bookingDetails, clientEmail },
      staffEmail: staffMember?.email ?? null,
      staffTelegramChatId: staffMember?.telegramChatId ?? null,
    }).catch((err) => console.error(`[${options.logLabel}] notifications`, err));
  }

  return { bookingId, updated: true };
}
