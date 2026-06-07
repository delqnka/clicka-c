import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { sql } from '@/lib/db';
import { Resend } from 'resend';
import {
  DOMAIN_PURCHASE_CURRENCY,
  type DomainPurchaseStatus,
  ensureDomainPurchaseSchema,
  formatDomainPurchaseStatus,
} from '@/lib/domain-purchase';
import {
  getPlatformAdminUrl,
  getPlatformPublicUrl,
} from '@/lib/domain-routing';
import { generateAdminMagicLink } from '@/lib/admin-auth';
import { ensurePlatformSubdomain } from '@/lib/vercel-domains';
import { creditSmsPack } from '@/lib/sms-reminders';
import { SMS_PACK_CREDITS } from '@/lib/sms-shared';

const resend = new Resend(process.env.RESEND_API_KEY);

function domainPurchaseNotificationRecipient() {
  return (
    process.env.DOMAIN_PURCHASE_NOTIFICATION_EMAIL ||
    process.env.RESEND_NOTIFICATION_EMAIL ||
    'support@clicka.bg'
  );
}

async function sendDomainPurchaseNotification(requestId: string) {
  if (!process.env.RESEND_API_KEY) return;

  await ensureDomainPurchaseSchema();

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
      r.setup_fee_cents,
      r.domain_fee_cents,
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
  const setupFee = Number(row.setup_fee_cents ?? 0) / 100;
  const domainFee = Number(row.domain_fee_cents ?? 0) / 100;
  const registrantEmail = String(row.registrant_email ?? '').trim();
  const fullDomain = String(row.full_domain ?? '').trim();
  const salonName = String(row.name ?? '').trim() || 'Твоят салон';
  const statusLabel = formatDomainPurchaseStatus(String(row.status ?? 'paid') as DomainPurchaseStatus);

  try {
    await resend.emails.send({
      from: 'Clicka.bg <noreply@clicka.bg>',
      to: domainPurchaseNotificationRecipient(),
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

  if (!registrantEmail) return;

  try {
    await resend.emails.send({
      from: 'Clicka.bg <noreply@clicka.bg>',
      to: registrantEmail,
      subject: `Домейн заявка за ${fullDomain} — плащането е успешно`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
          <h2>Потвърждение за домейн заявка</h2>
          <p>Благодарим! Получихме успешно плащането за домейн заявката на <strong>${salonName}</strong>.</p>
          <p><strong>Домейн:</strong> ${fullDomain}</p>
          <p><strong>Статус:</strong> ${statusLabel}</p>
          <p><strong>Разбивка:</strong></p>
          <ul>
            <li>Домейн (1 година): ${domainFee.toFixed(2)} EUR</li>
            <li>Техническа администрация и конфигуриране: ${setupFee.toFixed(2)} EUR</li>
            <li><strong>Общо:</strong> ${total.toFixed(2)} EUR</li>
          </ul>
          <p>Обичайният срок за свързване е 24-72 часа (в зависимост от DNS разпространението).</p>
          <p style="font-size: 13px; color: #666;">Ще получиш ново уведомление, когато домейнът е активен.</p>
        </div>
      `,
    });
  } catch {}
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Липсва подпис' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: 'Невалиден подпис' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { flow, domainPurchaseRequestId, salonSlug, templateId, planType } = session.metadata ?? {};

    console.log(`[stripe-webhook] ▶ Webhook received — event=${event.type} session=${session.id} amount=${session.amount_total} payment_status=${session.payment_status}`);
    console.log(`[stripe-webhook] 📦 Metadata — flow=${flow ?? 'none'} planType=${planType ?? 'none'} billingPeriod=${session.metadata?.billingPeriod ?? 'none'} salonSlug=${salonSlug ?? 'none'} smsAddon=${session.metadata?.smsAddon ?? '0'}`);

    if (flow === 'sms_pack') {
      const salonId = String(session.metadata?.salonId ?? '').trim();
      const credits = Math.max(1, Number(session.metadata?.credits ?? SMS_PACK_CREDITS) || SMS_PACK_CREDITS);
      if (salonId && session.payment_status === 'paid') {
        await creditSmsPack({
          salonId,
          credits,
          stripeSessionId: session.id,
        });
      }
      return NextResponse.json({ received: true });
    }

    if (flow === 'domain_purchase_request' && domainPurchaseRequestId) {
      await ensureDomainPurchaseSchema();
      await sql`
        UPDATE domain_purchase_requests
        SET
          status = 'paid',
          paid_at = now(),
          stripe_session_id = ${session.id},
          stripe_customer_id = ${(session.customer as string) ?? ''},
          updated_at = now()
        WHERE id = ${domainPurchaseRequestId}
      `;

      await sendDomainPurchaseNotification(String(domainPurchaseRequestId));
      return NextResponse.json({ received: true });
    }

    if (!salonSlug) {
      // Send invoice notification if billing info was provided
      const invoiceEik = String(session.metadata?.invoiceEik ?? '').trim();
      if (invoiceEik && process.env.RESEND_API_KEY) {
        const invoiceCompanyName = String(session.metadata?.invoiceCompanyName ?? '').trim();
        const invoiceVat = String(session.metadata?.invoiceVat ?? '').trim();
        const amountTotal = (session.amount_total ?? 0) / 100;
        const currency = (session.currency ?? 'eur').toUpperCase();
        const customerEmail = session.customer_details?.email ?? '';
        const customerName = session.customer_details?.name ?? '';
        const billingAddr = session.customer_details?.address;
        const addressStr = billingAddr
          ? [billingAddr.line1, billingAddr.city, billingAddr.postal_code, billingAddr.country].filter(Boolean).join(', ')
          : 'Не е попълнен';

        const notifEmail = process.env.RESEND_NOTIFICATION_EMAIL ?? 'support@clicka.bg';
        await resend.emails.send({
          from: 'Clicka.bg <noreply@clicka.bg>',
          to: notifEmail,
          subject: `Нова заявка за фактура — ${invoiceCompanyName} (${invoiceEik})`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
              <h2>Необходима е фактура за плащане</h2>
              <p><strong>План:</strong> ${planType ?? '—'}</p>
              <p><strong>Сума:</strong> ${amountTotal.toFixed(2)} ${currency}</p>
              <p><strong>Stripe Session:</strong> ${session.id}</p>
              <hr style="margin: 20px 0;" />
              <h3>Данни за фактура</h3>
              <p><strong>Фирма:</strong> ${invoiceCompanyName}</p>
              <p><strong>ЕИК:</strong> ${invoiceEik}</p>
              <p><strong>ДДС номер:</strong> ${invoiceVat || 'Не е посочен'}</p>
              <p><strong>Адрес за фактуриране:</strong> ${addressStr}</p>
              <hr style="margin: 20px 0;" />
              <h3>Данни на платеца</h3>
              <p><strong>Име:</strong> ${customerName || '—'}</p>
              <p><strong>Имейл:</strong> ${customerEmail || '—'}</p>
            </div>
          `,
        }).catch(() => {});
      }
      return NextResponse.json({ received: true });
    }

    console.log(`[stripe-webhook] 🌐 Ensuring platform subdomain for slug=${salonSlug}`);
    await ensurePlatformSubdomain(String(salonSlug));

    // Normalize planType to the canonical `plan` column value.
    const canonicalPlan = planType === 'ekip' ? 'team' : (planType ?? null);

    const billingPeriod = String(session.metadata?.billingPeriod ?? '12m');
    const billingMonths = billingPeriod === '6m' ? 6 : 12;

    console.log(`[stripe-webhook] 💾 Updating salon — slug=${salonSlug} plan=${canonicalPlan} billingPeriod=${billingPeriod} billingMonths=${billingMonths}`);

    await sql`
      UPDATE salons
      SET
        is_active = true,
        site_status = 'active',
        template_id = ${templateId ?? null},
        plan_type = ${planType ?? null},
        plan = ${canonicalPlan},
        billing_period = ${billingPeriod},
        plan_expires_at = now() + (${String(billingMonths)} || ' months')::interval,
        stripe_session_id = ${session.id},
        stripe_customer_id = ${(session.customer as string) ?? null}
      WHERE slug = ${salonSlug}
    `;

    console.log(`[stripe-webhook] ✅ Plan updated — plan=${canonicalPlan} expires_at=now()+${billingMonths}months`);

    const salons = await sql`
      SELECT email, name, owner_name FROM salons WHERE slug = ${salonSlug}
    `;

    if (salons.length > 0 && salons[0].email) {
      console.log(`[stripe-webhook] 📧 Sending welcome email to=${salons[0].email} salon=${salons[0].name}`);
      const { email, name, owner_name } = salons[0] as { email: string; name: string; owner_name?: string };
      const greeting = owner_name && String(owner_name).trim() ? `Здравей, ${String(owner_name).trim()}!` : 'Здравей!';
      const salonIdRows = await sql`SELECT CAST(id AS text) AS salon_id FROM salons WHERE slug = ${salonSlug} LIMIT 1`;
      const salonId = String((salonIdRows[0] as Record<string, unknown>)?.salon_id ?? '');

      const publicUrl = getPlatformPublicUrl(String(salonSlug));
      const adminUrl = getPlatformAdminUrl(String(salonSlug));

      const magicLink = salonId
        ? await generateAdminMagicLink({ salonId, slug: String(salonSlug), email, expiresMs: 24 * 60 * 60 * 1000 }).catch(() => adminUrl)
        : adminUrl;

      await resend.emails.send({
        from: `${name} <noreply@clicka.bg>`,
        to: email,
        subject: `Твоят сайт е готов! ✅`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #000; margin: 0 0 16px;">Твоят сайт е готов!</h2>
            <p style="line-height: 1.7;">${greeting}</p>
            <p style="line-height: 1.7;">
              Сайтът на <strong>${name}</strong> вече е активен на адрес:<br>
              <a href="${publicUrl}" style="color: #000; font-weight: 700;">${publicUrl}</a>
            </p>
            <p style="margin: 24px 0 8px; line-height: 1.7;">
              Натисни бутона, за да влезеш в контролния си панел и да персонализираш сайта:
            </p>
            <p style="margin: 0 0 24px;">
              <a href="${magicLink}"
                 style="display:inline-block;background:#000;color:#fff;text-decoration:none;
                        padding:14px 24px;border-radius:999px;font-weight:700;font-size:15px;">
                Отвори панела →
              </a>
            </p>
            <p style="line-height: 1.7; color: #6b7280; font-size: 13px;">
              Запомни адреса на твоя контролен панел: <strong>${publicUrl}/admin</strong>
            </p>
            ${planType === 'custom_domain' ? '<p style="line-height: 1.7;">Собственият домейн може да се свърже от таба „Домейн" в панела.</p>' : ''}
            <p style="margin-top: 24px; font-size: 13px; color: #999; line-height: 1.6;">
              Линкът е валиден 24 часа. Ако не сте поръчали сайт, игнорирайте имейла.
            </p>
          </div>
        `,
      });
      console.log(`[stripe-webhook] ✅ Welcome email sent to=${email}`);
    }

    console.log(`[stripe-webhook] 🏁 Checkout completed successfully — slug=${salonSlug} plan=${canonicalPlan} period=${billingPeriod}`);
  }

  return NextResponse.json({ received: true });
}
