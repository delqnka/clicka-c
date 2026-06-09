import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { sql } from '@/lib/db';
import { getOriginForHost, ROOT_DOMAIN } from '@/lib/domain-routing';
import {
  buildRequestedDomain,
  DOMAIN_PURCHASE_CURRENCY,
  type DomainPurchaseStatus,
  ensureDomainPurchaseSchema,
  formatDomainPurchaseStatus,
  getDomainPurchasePricing,
  loadLatestDomainPurchaseRequest,
  normalizeRequestedDomainLabel,
} from '@/lib/domain-purchase';
import { validateDomainPurchaseForm } from '@/lib/domain-purchase-shared';
import { stripe } from '@/lib/stripe';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const TERMS_VERSION = '2026-01-01';
const PRIVACY_VERSION = '2026-01-01';
const COOKIES_VERSION = '2026-01-01';

function getRequestIp(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') || '';
}

function notificationRecipient() {
  return (
    process.env.DOMAIN_PURCHASE_NOTIFICATION_EMAIL ||
    process.env.RESEND_NOTIFICATION_EMAIL ||
    'support@clicka.bg'
  );
}

async function sendDomainPurchaseNotification(requestId: string) {
  if (!resend) return;

  const rows = await sql`
    SELECT
      r.full_domain,
      r.registrant_name,
      r.registrant_email,
      r.registrant_phone,
      r.address_line1,
      r.city,
      r.postal_code,
      r.country_code,
      r.company_name,
      r.company_id,
      r.notes,
      r.total_fee_cents,
      r.currency,
      r.status,
      s.slug,
      s.name
    FROM domain_purchase_requests r
    JOIN salons s ON s.id::text = r.salon_id
    WHERE r.id = ${requestId}
    LIMIT 1
  `;

  if (rows.length === 0) return;

  const row = rows[0] as Record<string, unknown>;
  const total = Number(row.total_fee_cents ?? 0) / 100;

  try {
    await resend.emails.send({
      from: 'Clicka.bg <noreply@clicka.bg>',
      to: notificationRecipient(),
      subject: `Нова платена заявка за домейн: ${String(row.full_domain ?? '')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
          <h2>Нова платена заявка за домейн</h2>
          <p><strong>Салон:</strong> ${String(row.name ?? '')} (${String(row.slug ?? '')})</p>
          <p><strong>Домейн:</strong> ${String(row.full_domain ?? '')}</p>
          <p><strong>Статус:</strong> ${formatDomainPurchaseStatus(String(row.status ?? 'paid') as DomainPurchaseStatus)}</p>
          <p><strong>Сума:</strong> ${total.toFixed(2)} ${String(row.currency ?? DOMAIN_PURCHASE_CURRENCY).toUpperCase()}</p>
          <hr style="margin: 24px 0;" />
          <p><strong>Име:</strong> ${String(row.registrant_name ?? '')}</p>
          <p><strong>Имейл:</strong> ${String(row.registrant_email ?? '')}</p>
          <p><strong>Телефон:</strong> ${String(row.registrant_phone ?? '')}</p>
          <p><strong>Адрес:</strong> ${String(row.address_line1 ?? '')}, ${String(row.city ?? '')}, ${String(row.postal_code ?? '')}, ${String(row.country_code ?? '')}</p>
          <p><strong>Фирма:</strong> ${String(row.company_name ?? '') || 'Няма'}</p>
          <p><strong>ЕИК / VAT:</strong> ${String(row.company_id ?? '') || 'Няма'}</p>
          <p><strong>Бележки:</strong> ${String(row.notes ?? '') || 'Няма'}</p>
        </div>
      `,
    });
  } catch {}
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const latest = await loadLatestDomainPurchaseRequest(auth.salon.salonId);
  return NextResponse.json({ request: latest });
}

export async function POST(request: NextRequest) {
  await ensureDomainPurchaseSchema();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const auth = await requireAdminRequestAccess(
    request,
    String(body.slug ?? request.nextUrl.searchParams.get('slug') ?? '')
  );
  if (!auth.ok) return auth.response;

  const requestedLabel = normalizeRequestedDomainLabel(String(body.requestedLabel ?? ''));
  const tld = String(body.tld ?? '').trim().toLowerCase().replace(/^\./, '');
  const fullDomain = buildRequestedDomain(requestedLabel, tld);
  const registrantType =
    String(body.registrantType ?? 'individual') === 'company' ? 'company' : 'individual';
  const registrantName = String(body.registrantName ?? '').trim();
  const companyName = String(body.companyName ?? '').trim();
  const companyId = String(body.companyId ?? '').trim();
  const registrantEmail = String(body.registrantEmail ?? '').trim();
  const registrantPhone = String(body.registrantPhone ?? '').trim();
  const registrantViber = String(body.registrantViber ?? '').trim();
  const addressLine1 = String(body.addressLine1 ?? '').trim();
  const city = String(body.city ?? '').trim();
  const postalCode = String(body.postalCode ?? '').trim();
  const countryCode = String(body.countryCode ?? 'BG').trim().toUpperCase();
  const notes = String(body.notes ?? '').trim();
  const agreedToActOnBehalf =
    body.agreedToActOnBehalf === true || body.agreedToActOnBehalf === 'true';
  const agreedToPolicies =
    body.agreedToPolicies === true || body.agreedToPolicies === 'true';

  const fieldErrors = validateDomainPurchaseForm({
    requestedLabel,
    tld,
    registrantType,
    registrantName,
    companyName,
    companyId,
    registrantEmail,
    registrantPhone,
    addressLine1,
    city,
    postalCode,
    agreedToActOnBehalf,
    agreedToPolicies,
  });

  if (Object.keys(fieldErrors).length > 0) {
    const firstMessage = Object.values(fieldErrors)[0] ?? 'Попълни задължителните полета.';
    return NextResponse.json({ error: firstMessage, fields: fieldErrors }, { status: 400 });
  }

  if (!fullDomain) {
    return NextResponse.json({ error: 'Въведи желан домейн.' }, { status: 400 });
  }

  const pricing = getDomainPurchasePricing(tld);
  if (!pricing) {
    return NextResponse.json({ error: 'Избери поддържан домейн.' }, { status: 400 });
  }

  const consentIp = getRequestIp(request);

  const existingDomain = await sql`
    SELECT id
    FROM salons
    WHERE lower(custom_domain) = lower(${fullDomain})
    LIMIT 1
  `;
  if (existingDomain.length > 0) {
    return NextResponse.json(
      { error: 'Този домейн вече е зает в Clicka. Избери друг.' },
      { status: 409 }
    );
  }

  const requestRows = await sql`
    INSERT INTO domain_purchase_requests (
      salon_id,
      owner_id,
      requested_label,
      tld,
      full_domain,
      registrant_type,
      registrant_name,
      company_name,
      company_id,
      registrant_email,
      registrant_phone,
      registrant_viber,
      address_line1,
      city,
      postal_code,
      country_code,
      notes,
      setup_fee_cents,
      domain_fee_cents,
      total_fee_cents,
      currency,
      status,
      consent_at,
      consent_ip,
      terms_version,
      privacy_version,
      cookies_version,
      updated_at
    )
    VALUES (
      ${auth.salon.salonId},
      ${auth.session.ownerId},
      ${requestedLabel},
      ${pricing.tld},
      ${fullDomain},
      ${registrantType},
      ${registrantName},
      ${companyName},
      ${companyId},
      ${registrantEmail},
      ${registrantPhone},
      ${registrantViber},
      ${addressLine1},
      ${city},
      ${postalCode},
      ${countryCode},
      ${notes},
      ${pricing.setupFeeCents},
      ${pricing.domainFeeCents},
      ${pricing.totalFeeCents},
      ${pricing.currency},
      'requested',
      now(),
      ${consentIp},
      ${TERMS_VERSION},
      ${PRIVACY_VERSION},
      ${COOKIES_VERSION},
      now()
    )
    RETURNING id
  `;

  const requestId = String((requestRows[0] as Record<string, unknown>).id ?? '');
  const skipCheckout = process.env.CLICKA_SKIP_CHECKOUT === '1';

  if (skipCheckout) {
    await sql`
      UPDATE domain_purchase_requests
      SET
        status = 'paid',
        paid_at = now(),
        updated_at = now()
      WHERE id = ${requestId}
    `;

    await sendDomainPurchaseNotification(requestId);
    const createdRequest = await loadLatestDomainPurchaseRequest(auth.salon.salonId);

    return NextResponse.json({
      success: true,
      skipCheckout: true,
      request: createdRequest,
    });
  }

  const successBase = getOriginForHost(`${auth.salon.slug}.${ROOT_DOMAIN}`);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: pricing.currency,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: pricing.currency,
          unit_amount: pricing.totalFeeCents,
          product_data: {
            name: `Clicka.bg Домейн ${fullDomain}`,
            description: 'Домейн за 1 година + Техническа администрация и конфигуриране',
          },
        },
      },
    ],
    metadata: {
      flow: 'domain_purchase_request',
      domainPurchaseRequestId: requestId,
      salonSlug: auth.salon.slug,
      fullDomain,
    },
    customer_email: registrantEmail,
    success_url: `${successBase}/${auth.salon.slug}/admin?tab=domain&domainPurchase=success`,
    cancel_url: `${successBase}/${auth.salon.slug}/admin?tab=domain&domainPurchase=cancelled`,
  });

  await sql`
    UPDATE domain_purchase_requests
    SET
      stripe_session_id = ${session.id},
      updated_at = now()
    WHERE id = ${requestId}
  `;

  return NextResponse.json({
    success: true,
    checkoutUrl: session.url,
    requestId,
  });
}
