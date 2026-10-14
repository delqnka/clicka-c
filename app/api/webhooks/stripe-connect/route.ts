import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import type Stripe from 'stripe';
import { sql } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { alertOwnerWebhookFailure } from '@/lib/webhook-alert';
import { getClientPackageDefinition } from '@/lib/client-package-definitions';
import { createClientPackage } from '@/lib/client-packages';
import { sendClientPackageActivatedEmail } from '@/lib/resend';
import { confirmPaidBookingFromStripeSession } from '@/lib/stripe-booking-confirmation';

export const runtime = 'nodejs';

async function markEventProcessed(eventId: string): Promise<boolean> {
  const rows = await sql`
    INSERT INTO stripe_processed_events (event_id)
    VALUES (${eventId})
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `;
  return rows.length > 0;
}

async function unmarkEvent(eventId: string): Promise<void> {
  await sql`DELETE FROM stripe_processed_events WHERE event_id = ${eventId}`.catch(() => {});
}

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

  // Idempotency — skip duplicate events (Stripe retries on non-2xx or timeout)
  const isNew = await markEventProcessed(event.id);
  if (!isNew) {
    console.log(`[stripe-connect webhook] ⏭ Duplicate event skipped — id=${event.id}`);
    return NextResponse.json({ received: true });
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as {
      id: string;
      charges_enabled: boolean;
      payouts_enabled: boolean;
      details_submitted: boolean;
    };
    try {
      await sql`
        UPDATE salons SET
          stripe_charges_enabled   = ${account.charges_enabled},
          stripe_payouts_enabled   = ${account.payouts_enabled},
          stripe_details_submitted = ${account.details_submitted},
          stripe_onboarding_complete = ${account.charges_enabled && account.details_submitted}
        WHERE stripe_account_id = ${account.id}
      `;
    } catch (err) {
      console.error('[stripe-connect webhook] account.updated DB update failed:', err);
      Sentry.captureException(err, { extra: { eventId: event.id, accountId: account.id } });
      alertOwnerWebhookFailure({ label: 'Connect account.updated DB failed', eventId: event.id, detail: `accountId=${account.id}` });
      await unmarkEvent(event.id);
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
    }
  }

  if (event.type === 'checkout.session.completed') {
    let session = event.data.object as Stripe.Checkout.Session;
    const connectedAccountId = (event as { account?: string }).account;

    // Thin payload — fetch full session to get metadata
    if ((!session.metadata?.bookingId || !session.customer_details) && connectedAccountId) {
      try {
        session = await stripe.checkout.sessions.retrieve(session.id, {}, { stripeAccount: connectedAccountId });
      } catch (err) {
        console.error('[stripe-connect webhook] failed to fetch full session', err);
        Sentry.captureException(err, { extra: { sessionId: session.id } });
      }
    }

    if (session.payment_status === 'paid') {
      if (session.metadata?.type === 'package_purchase') {
        const salonId = session.metadata.salonId?.trim();
        const packageDefinitionId = session.metadata.packageDefinitionId?.trim();
        if (!salonId || !packageDefinitionId) {
          console.error('[stripe-connect webhook] missing package metadata', session.metadata);
          Sentry.captureException(new Error('Missing package purchase metadata'), { extra: { eventId: event.id, sessionId: session.id } });
          await unmarkEvent(event.id);
          return NextResponse.json({ error: 'Missing package metadata' }, { status: 500 });
        }

        try {
          const pkgDef = await getClientPackageDefinition({ salonId, id: packageDefinitionId });
          if (!pkgDef || pkgDef.isActive === false) {
            throw new Error(`Package definition not found or inactive: ${packageDefinitionId}`);
          }

          const customerEmail =
            normalizeEmail(session.customer_details?.email ?? undefined) ??
            normalizeEmail(session.metadata.clientEmail);
          const customerPhone =
            session.customer_details?.phone?.trim() ||
            session.metadata.clientPhone?.trim() ||
            null;
          const customerName =
            session.customer_details?.name?.trim() ||
            session.metadata.clientName?.trim() ||
            customerEmail?.split('@')[0] ||
            'Клиент';

          const created = await createClientPackage({
            salonId,
            clientName: customerName,
            clientPhone: customerPhone,
            clientEmail: customerEmail,
            packageName: pkgDef.name,
            totalSessions: pkgDef.totalSessions,
            price: session.amount_total != null ? session.amount_total / 100 : pkgDef.price,
            validityDays: pkgDef.validityDays,
            source: 'online',
            stripeCheckoutSessionId: session.id,
          });

          if (customerEmail) {
            const salonRows = await sql`
              SELECT name
              FROM salons
              WHERE CAST(id AS text) = ${salonId}
              LIMIT 1
            `.catch(() => []);
            const salonName = String((salonRows[0] as Record<string, unknown> | undefined)?.name ?? '');
            await sendClientPackageActivatedEmail(customerEmail, {
              salonId,
              salonName,
              clientName: customerName,
              packageName: created.packageName,
              totalSessions: created.totalSessions,
              usedSessions: created.usedSessions,
              remainingSessions: created.remainingSessions,
              validFrom: created.purchasedAt,
              validTo: created.expiresAt,
            }).catch((err) => console.error('[stripe-connect webhook] package activation email', err));
          }
        } catch (err) {
          console.error('[stripe-connect webhook] package activation failed:', err);
          Sentry.captureException(err, { extra: { eventId: event.id, sessionId: session.id, metadata: session.metadata } });
          alertOwnerWebhookFailure({ label: 'Connect package activation failed', eventId: event.id, detail: `sessionId=${session.id}`, amountCents: session.amount_total ?? 0 });
          await unmarkEvent(event.id);
          return NextResponse.json({ error: 'Package activation failed' }, { status: 500 });
        }

        return NextResponse.json({ received: true });
      }

      const bookingId = session.metadata?.bookingId;
      if (bookingId) {
        try {
          await confirmPaidBookingFromStripeSession(session, { logLabel: 'stripe-connect webhook' });
        } catch (err) {
          console.error('[stripe-connect webhook] booking update failed:', err);
          Sentry.captureException(err, { extra: { eventId: event.id, bookingId } });
          alertOwnerWebhookFailure({ label: 'Connect booking payment update failed', eventId: event.id, detail: `bookingId=${bookingId}`, amountCents: session.amount_total ?? 0 });
          await unmarkEvent(event.id);
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
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
      `.catch((err) => {
        console.error('[stripe-connect webhook] session.expired update failed:', err);
        Sentry.captureException(err, { extra: { eventId: event.id, bookingId } });
      });
    }
  }

  return NextResponse.json({ received: true });
}

function normalizeEmail(raw: string | null | undefined) {
  const email = raw?.trim().toLowerCase() ?? '';
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
