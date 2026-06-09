import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { isPlatformAdminRequest } from '@/lib/platform-admin-auth';
import { sql } from '@/lib/db';
import { ensureDomainPurchaseSchema, isDomainPurchaseDelayed } from '@/lib/domain-purchase';
import type { DomainPurchaseStatus } from '@/lib/domain-purchase-shared';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const ALLOWED_STATUSES: DomainPurchaseStatus[] = [
  'requested',
  'paid',
  'processing',
  'purchased',
  'connected',
  'rejected',
];

export async function GET(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  await ensureDomainPurchaseSchema();

  const rows = await sql`
    SELECT
      CAST(r.id AS text) AS id,
      r.full_domain,
      r.requested_label,
      r.tld,
      r.registrant_type,
      r.registrant_name,
      r.company_name,
      r.company_id,
      r.registrant_email,
      r.registrant_phone,
      r.address_line1,
      r.city,
      r.postal_code,
      r.country_code,
      r.notes,
      r.setup_fee_cents,
      r.domain_fee_cents,
      r.total_fee_cents,
      r.currency,
      r.status,
      r.consent_at,
      r.consent_ip,
      r.terms_version,
      r.privacy_version,
      r.cookies_version,
      r.paid_at,
      r.created_at,
      s.slug AS salon_slug,
      s.name AS salon_name
    FROM domain_purchase_requests r
    JOIN salons s ON s.id::text = r.salon_id
    ORDER BY r.created_at DESC
    LIMIT 200
  ` as { id: string; status: string; paid_at: string | null }[] & Record<string, unknown>[];

  let countNew = 0;
  let countProcessing = 0;
  let countDelayed = 0;
  let countCompleted = 0;

  const requests = rows.map((row) => {
    const status = String(row.status);
    const delayed = isDomainPurchaseDelayed(status, row.paid_at as string | null);
    const completed = status === 'purchased' || status === 'connected';

    if (delayed) countDelayed++;
    else if (completed) countCompleted++;
    else if (status === 'processing') countProcessing++;
    else if (status === 'requested' || status === 'paid') countNew++;

    return { ...row, is_delayed: delayed };
  });

  return NextResponse.json({
    requests,
    summary: {
      new: countNew,
      processing: countProcessing,
      delayed: countDelayed,
      completed: countCompleted,
    },
  });
}

async function sendDomainConnectedEmail(row: {
  full_domain: string;
  registrant_name: string;
  registrant_email: string;
}) {
  if (!resend || !row.registrant_email) return;
  try {
    await resend.emails.send({
      from: 'Clicka.bg <noreply@clicka.bg>',
      to: row.registrant_email,
      subject: `🎉 Домейнът ти е активен — ${row.full_domain}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; line-height: 1.6;">
          <p>Здравей${row.registrant_name ? `, ${row.registrant_name}` : ''},</p>
          <p>Домейнът ти вече е регистриран и свързан успешно.</p>
          <p>
            Можеш да го отвориш тук:<br />
            <a href="https://${row.full_domain}" target="_blank" rel="noopener noreferrer" style="font-weight: 600;">
              ${row.full_domain}
            </a>
          </p>
          <p>Всички бъдещи посетители и клиенти вече ще използват този адрес.</p>
          <p>Поздрави,<br />Екипът на Clicka</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[pa/domain-requests] Failed to send domain-active email:', err);
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? '').trim();
  const status = String(body.status ?? '').trim() as DomainPurchaseStatus;

  if (!id || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const rows = await sql`
    UPDATE domain_purchase_requests
    SET status = ${status}, updated_at = now()
    WHERE id = ${id}
    RETURNING full_domain, registrant_name, registrant_email, status
  ` as { full_domain: string; registrant_name: string; registrant_email: string; status: string }[];

  if (status === 'connected' && rows.length > 0) {
    await sendDomainConnectedEmail(rows[0]);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? '').trim();

  if (!id) {
    return NextResponse.json({ error: 'Липсва id.' }, { status: 400 });
  }

  const rows = await sql`
    DELETE FROM domain_purchase_requests
    WHERE id = ${id}
    RETURNING full_domain
  ` as { full_domain: string }[];

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Не е намерено.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, deleted: rows[0].full_domain });
}
