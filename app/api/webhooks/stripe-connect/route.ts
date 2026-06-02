import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { dispatchBookingNotifications } from '@/lib/booking-notifications';

export const runtime = 'nodejs';

// Must use raw body for Stripe signature verification
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error('[stripe-connect webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as {
      id: string;
      charges_enabled: boolean;
      payouts_enabled: boolean;
      details_submitted: boolean;
    };
    await sql`
      UPDATE salons SET
        stripe_charges_enabled   = ${account.charges_enabled},
        stripe_payouts_enabled   = ${account.payouts_enabled},
        stripe_details_submitted = ${account.details_submitted},
        stripe_onboarding_complete = ${account.charges_enabled && account.details_submitted}
      WHERE stripe_account_id = ${account.id}
    `;
  }

  if (event.type === 'checkout.session.completed') {
    let session = event.data.object as {
      id: string;
      amount_total: number | null;
      metadata?: Record<string, string> | null;
      payment_status: string;
    };

    // Thin payload — fetch full session to get metadata
    if (!session.metadata?.bookingId && (event as { account?: string }).account) {
      try {
        const full = await stripe.checkout.sessions.retrieve(session.id, {}, { stripeAccount: (event as { account?: string }).account });
        session = { ...session, metadata: full.metadata ?? {}, amount_total: full.amount_total };
      } catch (err) {
        console.error('[stripe-connect webhook] failed to fetch full session', err);
      }
    }

    if (session.payment_status === 'paid') {
      const bookingId = session.metadata?.bookingId;
      if (bookingId) {
        await sql`
          UPDATE bookings SET
            status         = 'confirmed',
            payment_status = 'paid',
            amount_paid    = ${session.amount_total ?? 0}
          WHERE id = ${bookingId}
            AND payment_status != 'paid'
        `;

        // Load booking + salon for notifications
        const rows = await sql`
          SELECT
            b.id, b.client_name, b.client_phone, b.client_email,
            b.service_name, b.service_price, b.service_duration,
            b.date, b.time, b.notes, b.manage_token,
            s.name AS salon_name, s.email AS salon_email,
            s.phone AS salon_phone, s.address AS salon_address,
            s.city AS salon_city, s.slug AS salon_slug,
            s.telegram_chat_id
          FROM bookings b
          JOIN salons s ON s.id = b.salon_id
          WHERE b.id = ${bookingId}
          LIMIT 1
        `.catch(() => []);

        if (rows.length > 0) {
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

          await dispatchBookingNotifications({
            salonEmail,
            clientEmail,
            telegramChatId,
            bookingDetails,
            telegramDetails: { ...bookingDetails, clientEmail },
          }).catch((err) => console.error('[stripe-connect webhook] notifications', err));
        }
      }
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as {
      metadata?: Record<string, string> | null;
    };
    const bookingId = session.metadata?.bookingId;
    if (bookingId) {
      await sql`
        UPDATE bookings SET
          status         = 'cancelled',
          payment_status = 'failed'
        WHERE id = ${bookingId}
          AND payment_status = 'pending'
      `;
    }
  }

  return NextResponse.json({ received: true });
}
