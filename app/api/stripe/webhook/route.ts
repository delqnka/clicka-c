// Handles booking deposit payments only — the single allowed money flow:
// client pays salon via Stripe Connect, never Clicka. No subscriptions, no
// platform billing of any kind. See docs/project-vision.md.
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { sql } from '@/lib/db';
import { dispatchBookingNotifications } from '@/lib/booking-notifications';
import { getStaffMemberById } from '@/lib/staff-members';
import { alertOwnerWebhookFailure } from '@/lib/webhook-alert';

let cachedStripe: Stripe | null = null;
function getStripe(): Stripe {
  if (cachedStripe) return cachedStripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  cachedStripe = new Stripe(key);
  return cachedStripe;
}
const stripe = new Proxy({} as Stripe, {
  get: (_t, p, r) => Reflect.get(getStripe(), p, r),
});

async function markBookingEventProcessed(eventId: string): Promise<boolean> {
  const rows = await sql`
    INSERT INTO stripe_processed_events (event_id)
    VALUES (${eventId})
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `;
  return rows.length > 0;
}

async function unmarkBookingEvent(eventId: string): Promise<void> {
  await sql`DELETE FROM stripe_processed_events WHERE event_id = ${eventId}`.catch(() => {});
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_BOOKING_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const isNew = await markBookingEventProcessed(event.id);
  if (!isNew) {
    console.log(`[stripe/webhook] ⏭ Duplicate event skipped — id=${event.id}`);
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const { bookingId, salonSlug } = session.metadata ?? {};

  if (!bookingId || !salonSlug) {
    console.error('[stripe/webhook] missing metadata', session.metadata);
    return NextResponse.json({ received: true });
  }

  // Update booking payment_status — unmark on failure so Stripe can retry
  try {
    const updated = await sql`
      UPDATE bookings
      SET payment_status = 'paid'
      WHERE id = ${bookingId}
      RETURNING id
    `;
    if (updated.length === 0) {
      console.error(`[stripe/webhook] booking not found for update — id=${bookingId}`);
      Sentry.captureException(new Error(`Booking not found for payment update — id=${bookingId}`), { extra: { eventId: event.id, bookingId } });
      alertOwnerWebhookFailure({ label: 'Booking not found for payment update', eventId: event.id, detail: `bookingId=${bookingId}` });
      await unmarkBookingEvent(event.id);
      return NextResponse.json({ error: 'Booking not found' }, { status: 500 });
    }
  } catch (err) {
    console.error('[stripe/webhook] update payment_status failed:', err);
    Sentry.captureException(err, { extra: { eventId: event.id, bookingId } });
    alertOwnerWebhookFailure({ label: 'Booking payment_status update failed', eventId: event.id, detail: `bookingId=${bookingId}` });
    await unmarkBookingEvent(event.id);
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
  }

  // Load booking + salon data for notifications
  const rows = await sql`
    SELECT
      b.id, b.client_name, b.client_phone, b.client_email,
      b.service_name, b.service_price, b.service_duration, b.booking_quantity,
      b.date, b.time, b.notes, b.manage_token, b.staff_member_id,
      CAST(s.id AS text) AS salon_id,
      s.name AS salon_name, s.owner_name AS salon_owner_name, s.email AS salon_email, s.phone AS salon_phone,
      s.address AS salon_address, s.city AS salon_city,
      s.telegram_chat_id, s.language
    FROM bookings b
    JOIN salons s ON s.id = b.salon_id
    WHERE b.id = ${bookingId}
    LIMIT 1
  `.catch(() => []);

  if (rows.length === 0) {
    console.error('[stripe/webhook] booking not found', bookingId);
    return NextResponse.json({ received: true });
  }

  const row = rows[0] as Record<string, unknown>;

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
    salonName: String(row.salon_name ?? ''),
    salonOwnerName: row.salon_owner_name ? String(row.salon_owner_name) : undefined,
    salonEmail: row.salon_email ? String(row.salon_email) : undefined,
    salonPhone: row.salon_phone ? String(row.salon_phone) : undefined,
    salonAddress:
      [row.salon_address, row.salon_city]
        .map((v) => String(v ?? '').trim())
        .filter(Boolean)
        .join(', ') || undefined,
    language: row.language ? String(row.language) : undefined,
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
  }).catch((err) => console.error('[stripe/webhook] dispatch notifications', err));

  return NextResponse.json({ received: true });
}
