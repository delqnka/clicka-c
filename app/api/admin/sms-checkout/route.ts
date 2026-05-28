import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { getPlatformAdminUrl } from '@/lib/domain-routing';
import { ensureSmsSchema } from '@/lib/ensure-sms-schema';
import { SMS_PACK_CREDITS, SMS_PACK_PRICE_CENTS } from '@/lib/sms-shared';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Липсва STRIPE_SECRET_KEY');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  await ensureSmsSchema();

  try {
    const adminUrl = getPlatformAdminUrl(auth.salon.slug);

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      currency: 'eur',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: SMS_PACK_PRICE_CENTS,
            product_data: {
              name: 'Clicka.bg — SMS пакет',
              description: `${SMS_PACK_CREDITS} SMS напомняния за клиенти`,
            },
          },
        },
      ],
      metadata: {
        flow: 'sms_pack',
        salonId: auth.salon.salonId,
        salonSlug: auth.salon.slug,
        credits: String(SMS_PACK_CREDITS),
      },
      customer_email: auth.session.ownerEmail || undefined,
      success_url: `${adminUrl}?tab=sms&smsPurchase=success`,
      cancel_url: `${adminUrl}?tab=sms&smsPurchase=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Неуспешно създаване на checkout.' }, { status: 500 });
    }

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('[sms-checkout]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при плащане' },
      { status: 500 },
    );
  }
}
