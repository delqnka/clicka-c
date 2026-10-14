import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getClientPackageDefinition } from '@/lib/client-package-definitions';
import { stripe } from '@/lib/stripe';

type PackageCheckoutBody = {
  salonSlug?: string;
  packageDefinitionId?: string;
  returnUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as PackageCheckoutBody;
  const salonSlug = body.salonSlug?.trim();
  const packageDefinitionId = body.packageDefinitionId?.trim();

  if (!salonSlug || !packageDefinitionId) {
    return NextResponse.json({ error: 'Липсва салон или пакет.' }, { status: 400 });
  }

  const rows = await sql`
    SELECT CAST(id AS text) AS id, slug, stripe_account_id, stripe_charges_enabled
    FROM salons
    WHERE slug = ${salonSlug}
      AND is_active = true
    LIMIT 1
  `;
  const salon = rows[0] as {
    id: string;
    slug: string;
    stripe_account_id: string | null;
    stripe_charges_enabled: boolean;
  } | undefined;

  if (!salon) {
    return NextResponse.json({ error: 'Салонът не е намерен.' }, { status: 404 });
  }

  if (!salon.stripe_account_id || !salon.stripe_charges_enabled) {
    return NextResponse.json(
      { error: 'Салонът не приема онлайн плащания в момента.' },
      { status: 400 },
    );
  }

  const pkg = await getClientPackageDefinition({
    salonId: salon.id,
    id: packageDefinitionId,
  });

  if (!pkg || pkg.isActive === false) {
    return NextResponse.json({ error: 'Пакетът не е активен.' }, { status: 404 });
  }

  if (pkg.price == null || pkg.price <= 0) {
    return NextResponse.json(
      { error: 'Пакетът няма валидна цена за онлайн плащане.' },
      { status: 400 },
    );
  }

  const host = request.headers.get('host') ?? '';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const origin = `${proto}://${host}`;
  const returnOrigin = normalizeReturnOrigin(body.returnUrl);
  const successUrl =
    normalizeAbsoluteHttpUrl(body.successUrl) ??
    (returnOrigin
      ? `${returnOrigin}/booking/success?package_id=${encodeURIComponent(pkg.id)}`
      : `${origin}/booking/success?package_id=${encodeURIComponent(pkg.id)}&return=${encodeURIComponent(origin)}`);
  const cancelUrl =
    normalizeAbsoluteHttpUrl(body.cancelUrl) ??
    (returnOrigin
      ? `${returnOrigin}/booking/cancel?package_id=${encodeURIComponent(pkg.id)}`
      : `${origin}/booking/cancel?package_id=${encodeURIComponent(pkg.id)}&return=${encodeURIComponent(origin)}`);

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: normalizeEmail(body.clientEmail) ?? undefined,
      phone_number_collection: { enabled: true },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: Math.round(pkg.price * 100),
            product_data: {
              name: pkg.name,
              description: [
                `${pkg.totalSessions} ${pkg.totalSessions === 1 ? 'кредит' : 'кредита'}`,
                '1 кредит = 1 тренировка',
                `Валидност: ${pkg.validityDays} дни`,
                pkg.description,
              ].filter(Boolean).join(' · '),
            },
          },
        },
      ],
      metadata: {
        type: 'package_purchase',
        salonId: salon.id,
        salonSlug: salon.slug,
        packageDefinitionId: pkg.id,
        clientName: body.clientName?.trim().slice(0, 500) ?? '',
        clientPhone: body.clientPhone?.trim().slice(0, 500) ?? '',
        clientEmail: normalizeEmail(body.clientEmail) ?? '',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
    {
      stripeAccount: salon.stripe_account_id,
    },
  );

  return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id });
}

function normalizeReturnOrigin(raw: string | undefined) {
  const url = normalizeAbsoluteHttpUrl(raw);
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function normalizeAbsoluteHttpUrl(raw: string | undefined) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const isLocalhost = url.hostname === 'localhost' || url.hostname.endsWith('.localhost');
    if (url.protocol !== 'https:' && !(isLocalhost && url.protocol === 'http:')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeEmail(raw: string | undefined) {
  const email = raw?.trim().toLowerCase() ?? '';
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
