import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isPlatformAdminRequest } from '@/lib/platform-admin-auth';
import { sql } from '@/lib/db';
import {
  ensureAdminAuthSchema,
  getPrimaryOwnerForSalon,
  normalizeEmail,
  sha256,
} from '@/lib/admin-auth';
import { getCustomDomainAdminUrl, getPlatformSiteOrigin } from '@/lib/domain-routing';
import { getSalonResend } from '@/lib/resend';

function buildAdminMagicLink({
  base,
  slug,
  token,
  email,
  hasPassword,
}: {
  base: string;
  slug: string;
  token: string;
  email: string;
  hasPassword: boolean;
}) {
  if (hasPassword) {
    return `${base}/admin/sign-in?email=${encodeURIComponent(email)}`;
  }

  return `${base}/admin/set-password?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(slug)}`;
}

export async function POST(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  await ensureAdminAuthSchema();

  const body = await request.json().catch(() => ({}));
  const { salonId, email: rawEmail } = body as { salonId?: string; email?: string };

  if (!salonId) {
    return NextResponse.json({ error: 'Липсва salonId' }, { status: 400 });
  }

  const rows = await sql`
    SELECT
      CAST(id AS text) AS salon_id,
      slug,
      name,
      email,
      owner_name,
      plan_type,
      custom_domain,
      domain_status
    FROM salons
    WHERE CAST(id AS text) = ${salonId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Салонът не е намерен' }, { status: 404 });
  }

  const salon = rows[0] as Record<string, unknown>;
  const email = normalizeEmail(
    typeof rawEmail === 'string' && rawEmail.trim() ? rawEmail : String(salon.email ?? ''),
  );

  if (!email) {
    return NextResponse.json({ error: 'Липсва имейл за клиента' }, { status: 400 });
  }
  if (!email.includes('@') || email.startsWith('@') || email.endsWith('@')) {
    return NextResponse.json({ error: 'Невалиден имейл' }, { status: 400 });
  }

  const slug = String(salon.slug ?? '');
  const owner = await getPrimaryOwnerForSalon(salonId);
  const passwordRows = owner
    ? await sql`SELECT password_hash FROM site_owners WHERE id = ${owner.ownerId} LIMIT 1`
    : [];
  const hasPassword = !!String((passwordRows[0] as Record<string, unknown> | undefined)?.password_hash ?? '');

  const customDomain =
    String(salon.domain_status ?? '').toLowerCase() === 'active' &&
    typeof salon.custom_domain === 'string' &&
    salon.custom_domain.trim()
      ? salon.custom_domain.trim().toLowerCase()
      : null;

  const base = customDomain ? getCustomDomainAdminUrl(customDomain) : getPlatformSiteOrigin(slug);
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (!hasPassword) {
    await sql`DELETE FROM admin_login_tokens WHERE salon_id = ${salonId}`;
    await sql`
      INSERT INTO admin_login_tokens (salon_id, token_hash, email_norm, expires_at, used_at, created_at)
      VALUES (${salonId}, ${tokenHash}, ${email}, ${expiresAt.toISOString()}, null, now())
    `;
  }

  const magicLink = buildAdminMagicLink({
    base,
    slug,
    token,
    email,
    hasPassword,
  });

  const { client, from } = await getSalonResend(salonId, String(salon.name ?? ''));
  if (!client) {
    return NextResponse.json({ ok: true, email, magicLink, emailSent: false });
  }

  const displayName = String(salon.name ?? '').trim() || 'твоят салон';
  const greeting =
    typeof salon.owner_name === 'string' && salon.owner_name.trim()
      ? `Здравей, ${salon.owner_name.trim()}!`
      : 'Здравей!';

  const sendResult = await client.emails
    .send({
      from,
      to: email,
      subject: hasPassword ? 'Вход в админ панела' : 'Довърши регистрацията си',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">${hasPassword ? 'Вход в панела' : 'Довърши регистрацията си'}</h2>
        <p style="line-height: 1.7;">${greeting}</p>
        <p style="line-height: 1.7;">
          ${hasPassword
            ? `Използвай бутона, за да влезеш в админ панела на <strong>${displayName}</strong>.`
            : `Използвай бутона, за да зададеш парола и да активираш админ панела на <strong>${displayName}</strong>.`}
        </p>
        <p style="margin: 24px 0;">
          <a href="${magicLink}"
             style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:700;font-size:15px;">
            ${hasPassword ? 'Отвори панела' : 'Задай парола'}
          </a>
        </p>
        <p style="line-height: 1.7; color: #6b7280; font-size: 13px;">
          Адрес на панела: <strong>${base.replace(/^https?:\/\//, '')}/admin</strong>
        </p>
      </div>
    `,
    })
    .then((res) => ({ ok: true as const, res }))
    .catch((err: unknown) => ({ ok: false as const, err }));

  if (!sendResult.ok) {
    const message =
      sendResult.err instanceof Error ? sendResult.err.message : String(sendResult.err ?? 'unknown');
    console.error('[pa/send-invite] resend failed', { salonId, email, from, message });
    return NextResponse.json(
      { error: `Resend: ${message}`, magicLink, emailSent: false },
      { status: 502 },
    );
  }

  // Resend SDK returns { data, error } on success — surface API-level errors too.
  const resendApiError = (sendResult.res as { error?: { message?: string } } | null)?.error;
  if (resendApiError) {
    const message = resendApiError.message ?? 'Resend върна грешка';
    console.error('[pa/send-invite] resend api error', { salonId, email, from, message });
    return NextResponse.json(
      { error: `Resend: ${message}`, magicLink, emailSent: false },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, email, magicLink, emailSent: true });
}
