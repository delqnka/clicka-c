import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { creditSmsPack } from '@/lib/sms-reminders';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_SMS_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('[sms-webhook] missing sig or secret');
    return NextResponse.json({ error: 'Missing configuration' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[sms-webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const { flow, salonId, credits } = session.metadata ?? {};

  if (flow !== 'sms_pack' || !salonId || !credits) {
    return NextResponse.json({ received: true });
  }

  await creditSmsPack({
    salonId,
    credits: Number(credits),
    stripeSessionId: session.id,
  });

  console.log(`[sms-webhook] credited ${credits} SMS to salon ${salonId}`);

  return NextResponse.json({ received: true });
}
