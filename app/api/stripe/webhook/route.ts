import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@/lib/db';
import { dispatchBookingNotifications } from '@/lib/booking-notifications';
import { getStaffMemberById } from '@/lib/staff-members';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

  const session = event.data.object as Stripe.Checkout.Session;
  const { bookingId, salonSlug } = session.metadata ?? {};

  if (!bookingId || !salonSlug) {
    console.error('[stripe/webhook] missing metadata', session.metadata);
    return NextResponse.json({ received: true });
  }

  // Update booking payment_status
  await sql`
    UPDATE bookings
    SET payment_status = 'paid'
    WHERE id = ${bookingId}
  `.catch((err) => console.error('[stripe/webhook] update payment_status', err));

  // Load booking + salon data for notifications
  const rows = await sql`
    SELECT
      b.id, b.client_name, b.client_phone, b.client_email,
      b.service_name, b.service_price, b.service_duration,
      b.date, b.time, b.notes, b.manage_token, b.staff_member_id,
      s.name AS salon_name, s.email AS salon_email, s.phone AS salon_phone,
      s.address AS salon_address, s.city AS salon_city,
      s.telegram_chat_id
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
    date: String(row.date ?? ''),
    time: String(row.time ?? ''),
    notes: row.notes ? String(row.notes) : undefined,
    salonName: String(row.salon_name ?? ''),
    salonEmail: row.salon_email ? String(row.salon_email) : undefined,
    salonPhone: row.salon_phone ? String(row.salon_phone) : undefined,
    salonAddress:
      [row.salon_address, row.salon_city]
        .map((v) => String(v ?? '').trim())
        .filter(Boolean)
        .join(', ') || undefined,
  };

  const clientEmail = String(row.client_email ?? '').trim();
  const salonEmail = row.salon_email ? String(row.salon_email).trim() : null;
  const telegramChatId = row.telegram_chat_id ? String(row.telegram_chat_id).trim() : null;
  const staffMemberId = row.staff_member_id ? String(row.staff_member_id) : null;
  const staffMember = staffMemberId ? await getStaffMemberById(staffMemberId).catch(() => null) : null;

  await dispatchBookingNotifications({
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
