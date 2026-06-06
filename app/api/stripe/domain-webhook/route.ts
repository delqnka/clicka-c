import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { sql } from '@/lib/db';
import { ensureDomainPurchaseSchema, formatDomainPurchaseStatus, type DomainPurchaseStatus } from '@/lib/domain-purchase';
import { syncDomainWithVercel } from '@/lib/vercel-domains';
import { sendTelegramMessage } from '@/lib/telegram';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function notificationRecipient() {
  return (
    process.env.DOMAIN_PURCHASE_NOTIFICATION_EMAIL ||
    process.env.RESEND_NOTIFICATION_EMAIL ||
    'support@clicka.bg'
  );
}

type PurchaseRow = {
  id: string;
  full_domain: string;
  tld: string;
  registrant_name: string;
  registrant_email: string;
  registrant_phone: string;
  address_line1: string;
  city: string;
  postal_code: string;
  country_code: string;
  company_name: string;
  company_id: string;
  notes: string;
  total_fee_cents: number;
  currency: string;
  status: string;
  slug: string;
  salon_name: string;
};

async function loadRow(requestId: string): Promise<PurchaseRow | null> {
  const rows = await sql`
    SELECT
      r.id, r.full_domain, r.tld,
      r.registrant_name, r.registrant_email, r.registrant_phone,
      r.address_line1, r.city, r.postal_code, r.country_code,
      r.company_name, r.company_id, r.notes,
      r.total_fee_cents, r.currency, r.status,
      s.slug, s.name AS salon_name
    FROM domain_purchase_requests r
    JOIN salons s ON s.id::text = r.salon_id
    WHERE r.id = ${requestId}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return rows[0] as PurchaseRow;
}

async function connectDomainToSalon(slug: string, domain: string) {
  const provider = await syncDomainWithVercel(domain);

  const configJson = JSON.stringify({
    provider: provider.provider,
    dnsInstructions: provider.dnsInstructions,
    verificationInstructions: provider.verificationInstructions,
    configuredBy: provider.configuredBy,
    misconfigured: provider.misconfigured,
    verified: provider.verified,
    checkedAt: new Date().toISOString(),
  });

  const isActive = provider.status === 'active';

  await sql`
    UPDATE salons
    SET
      custom_domain = ${domain},
      domain_status = ${provider.status},
      domain_last_checked_at = now(),
      domain_verified_at = CASE WHEN ${isActive} THEN now() ELSE domain_verified_at END,
      domain_config = ${configJson},
      updated_at = now()
    WHERE slug = ${slug}
  `;

  return provider;
}

async function sendAdminNotification(row: PurchaseRow) {
  if (!resend) return;
  const total = (Number(row.total_fee_cents) / 100).toFixed(2);
  const currency = String(row.currency).toUpperCase();

  await resend.emails.send({
    from: 'Clicka.bg <noreply@clicka.bg>',
    to: notificationRecipient(),
    subject: `⚠ Нова платена заявка за домейн: ${row.full_domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2>Платена заявка за домейн — необходима е ръчна покупка</h2>
        <p><strong>Салон:</strong> ${row.salon_name} (${row.slug})</p>
        <p><strong>Домейн:</strong> ${row.full_domain}</p>
        <p><strong>Статус:</strong> ${formatDomainPurchaseStatus(row.status as DomainPurchaseStatus)}</p>
        <p><strong>Сума:</strong> ${total} ${currency}</p>
        <hr style="margin: 24px 0;" />
        <p><strong>Регистрант:</strong> ${row.registrant_name}</p>
        <p><strong>Имейл:</strong> ${row.registrant_email}</p>
        <p><strong>Телефон:</strong> ${row.registrant_phone}</p>
        <p><strong>Адрес:</strong> ${row.address_line1}, ${row.city}, ${row.postal_code}, ${row.country_code}</p>
        <p><strong>Фирма:</strong> ${row.company_name || 'Няма'}</p>
        <p><strong>ЕИК / VAT:</strong> ${row.company_id || 'Няма'}</p>
        <p><strong>Бележки:</strong> ${row.notes || 'Няма'}</p>
      </div>
    `,
  }).catch(() => {});
}

async function sendTelegramNotification(row: PurchaseRow) {
  const ownerChatId = process.env.CLICKA_OWNER_CHAT_ID;
  if (!ownerChatId) return;

  const total = (Number(row.total_fee_cents) / 100).toFixed(2);
  const currency = String(row.currency).toUpperCase();

  const text = [
    `🌐 <b>Нова заявка за домейн</b>`,
    ``,
    `<b>Домейн:</b> ${row.full_domain}`,
    `<b>Салон:</b> ${row.salon_name} (${row.slug})`,
    `<b>Сума:</b> ${total} ${currency}`,
    ``,
    `<b>Регистрант:</b> ${row.registrant_name}`,
    `<b>Имейл:</b> ${row.registrant_email}`,
    `<b>Телефон:</b> ${row.registrant_phone}`,
    `<b>Адрес:</b> ${row.address_line1}, ${row.city}, ${row.postal_code}`,
    row.company_name ? `<b>Фирма:</b> ${row.company_name}` : null,
    row.company_id ? `<b>ЕИК:</b> ${row.company_id}` : null,
    row.notes ? `<b>Бележки:</b> ${row.notes}` : null,
    ``,
    `⚠️ Необходима е ръчна покупка`,
  ].filter(Boolean).join('\n');

  await sendTelegramMessage(ownerChatId, text).catch(() => {});
}

async function handleDomainPurchase(requestId: string, salonSlug: string) {
  await ensureDomainPurchaseSchema();

  const row = await loadRow(requestId);
  if (!row) {
    console.error('[domain-webhook] request not found', requestId);
    return;
  }

  // Idempotency — skip if already past 'requested' state
  if (!['requested', 'paid'].includes(row.status)) {
    console.log('[domain-webhook] skipping, status=', row.status);
    return;
  }

  // Mark paid then processing
  await sql`
    UPDATE domain_purchase_requests
    SET status = 'processing', paid_at = COALESCE(paid_at, now()), updated_at = now()
    WHERE id = ${requestId} AND status IN ('requested', 'paid')
  `;

  // Add domain to Vercel so DNS instructions are immediately visible to admin
  await connectDomainToSalon(salonSlug, row.full_domain).catch(err =>
    console.error('[domain-webhook] vercel sync failed', err)
  );

  // Notify admin via email and Telegram
  await sendAdminNotification({ ...row, status: 'processing' });
  await sendTelegramNotification({ ...row, status: 'processing' });

  console.log(`[domain-webhook] done — domain=${row.full_domain} salonSlug=${salonSlug}`);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_DOMAIN_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('[domain-webhook] missing sig or secret');
    return NextResponse.json({ error: 'Missing configuration' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[domain-webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const { flow, domainPurchaseRequestId, salonSlug } = session.metadata ?? {};

  if (flow !== 'domain_purchase_request' || !domainPurchaseRequestId || !salonSlug) {
    return NextResponse.json({ received: true });
  }

  // Return 200 immediately, process async
  void handleDomainPurchase(domainPurchaseRequestId, salonSlug);

  return NextResponse.json({ received: true });
}
