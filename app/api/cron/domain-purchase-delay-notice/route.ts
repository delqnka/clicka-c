import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import * as Sentry from '@sentry/nextjs';
import { sql } from '@/lib/db';
import { ensureDomainPurchaseSchema, isDomainPurchaseDelayed } from '@/lib/domain-purchase';
import { sendTelegramMessage } from '@/lib/telegram';
import { sendGoogleReviewInvitation } from '@/lib/resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const STATUS_LABELS: Record<string, string> = {
  paid: 'Платена',
  processing: 'Обработва се',
};

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get('x-cron-secret') === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!resend) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 'no resend api key' });
  }

  await ensureDomainPurchaseSchema();

  const rows = await sql`
    SELECT
      r.id, r.full_domain, r.registrant_name, r.registrant_email,
      r.status, r.paid_at
    FROM domain_purchase_requests r
    WHERE r.status IN ('paid', 'processing')
      AND r.paid_at IS NOT NULL
      AND r.delay_notice_sent_at IS NULL
      AND r.registrant_email <> ''
    LIMIT 200
  ` as { id: string; full_domain: string; registrant_name: string; registrant_email: string; status: string; paid_at: string }[];

  const now = new Date();
  const ownerChatId = process.env.CLICKA_OWNER_CHAT_ID;

  let sent = 0;

  for (const row of rows) {
    if (!isDomainPurchaseDelayed(row.status, row.paid_at)) continue;
    const paidAt = new Date(row.paid_at);

    try {
      await resend.emails.send({
        from: 'Clicka.bg <noreply@clicka.bg>',
        to: row.registrant_email,
        subject: `Регистрацията на ${row.full_domain} е в процес на изпълнение`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; line-height: 1.6;">
            <p>Здравей, ${String(row.registrant_name ?? '').trim() || 'друже'},</p>
            <p>
              Искаме да те уведомим, че заявката ти за регистрация на домейн
              <strong>${row.full_domain}</strong> е приета и в момента я обработваме.
            </p>
            <p>
              В повечето случаи това отнема само няколко часа, но понякога може да отнеме малко
              повече време — например при допълнителна проверка от регистратора на домейни.
              Не е необходимо да правиш нищо от твоя страна.
            </p>
            <p>
              Сайтът ти продължава да работи нормално на безплатния адрес в Clicka и можеш да
              приемаш резервации без прекъсване, докато довършваме свързването на новия домейн.
            </p>
            <p>
              Ще ти изпратим съобщение веднага щом всичко е готово — обикновено в рамките на до
              2 работни дни от плащането.
            </p>
            <p>Благодарим ти за търпението!<br />Екипът на Clicka.bg</p>
          </div>
        `,
      });

      await sql`
        UPDATE domain_purchase_requests
        SET delay_notice_sent_at = now()
        WHERE id = ${row.id}
      `;
      sent++;

      if (ownerChatId) {
        const hoursSincePaid = Math.floor((now.getTime() - paidAt.getTime()) / (60 * 60 * 1000));
        const text = [
          `⚠️ <b>Забавена домейн заявка</b>`,
          ``,
          `<b>Домейн:</b> ${row.full_domain}`,
          `<b>Клиент:</b> ${row.registrant_name}`,
          `<b>Имейл:</b> ${row.registrant_email}`,
          `<b>Платено преди:</b> ${hoursSincePaid} часа`,
          `<b>Статус:</b> ${STATUS_LABELS[row.status] ?? row.status}`,
          ``,
          `Изпратен е автоматичен имейл до клиента.`,
        ].join('\n');
        await sendTelegramMessage(ownerChatId, text).catch(() => {});
      }
    } catch (err) {
      console.error(`[domain-purchase-delay-notice] Failed for domain_purchase_request id=${row.id}:`, err);
      Sentry.captureException(err, { extra: { requestId: row.id, domain: row.full_domain } });
    }
  }

  // ── Google Review invitations ─────────────────────────────────────────────
  // Find today's confirmed bookings whose appointment time has passed (≥1h ago)
  // Mark them completed and send a review invitation email.
  let reviewsSent = 0;

  const reviewRows = await sql`
    SELECT
      b.id AS booking_id,
      b.client_email,
      b.client_name,
      s.google_place_id,
      s.name  AS salon_name,
      s.slug  AS salon_slug
    FROM bookings b
    JOIN salons s ON s.id::text = b.salon_id::text
    WHERE b.date::date = CURRENT_DATE
      AND b.time::time <= (NOW() AT TIME ZONE 'Europe/Sofia' - INTERVAL '1 hour')::time
      AND b.status = 'confirmed'
      AND b.google_review_invite_sent_at IS NULL
      AND s.google_place_id IS NOT NULL
      AND s.google_place_id <> ''
      AND b.client_email IS NOT NULL
      AND b.client_email <> ''
    LIMIT 200
  ` as { booking_id: string; client_email: string; client_name: string; google_place_id: string; salon_name: string; salon_slug: string }[];

  for (const r of reviewRows) {
    const locked = await sql`
      UPDATE bookings
      SET status = 'completed',
          completed_at = now(),
          google_review_invite_sent_at = now()
      WHERE id = ${r.booking_id}
        AND status = 'confirmed'
        AND google_review_invite_sent_at IS NULL
      RETURNING id
    `;
    if (locked.length === 0) continue;

    try {
      await sendGoogleReviewInvitation(
        r.client_email,
        r.client_name,
        r.salon_name,
        r.google_place_id,
        r.salon_slug,
      );
      reviewsSent++;
    } catch (err) {
      console.error('[review-cron] send failed', r.booking_id, err);
      Sentry.captureException(err, { extra: { bookingId: r.booking_id, email: r.client_email } });
    }
  }

  return NextResponse.json({ ok: true, sent, checked: rows.length, reviewsSent });
}
