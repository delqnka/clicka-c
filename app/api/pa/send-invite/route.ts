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
import { getCustomDomainAdminUrl, isSalonCustomDomainUsable } from '@/lib/domain-routing';
import { getSalonResend } from '@/lib/resend';

function buildAdminMagicLink({
  base,
  slug,
  token,
  email,
  hasPassword,
  locale,
}: {
  base: string;
  slug: string;
  token: string;
  email: string;
  hasPassword: boolean;
  locale: 'bg' | 'en';
}) {
  // `lang` is read by the destination page and locks the UI to the language
  // the agency picked when sending the invite. No toggle is shown to the
  // recipient when this parameter is present.
  const langParam = `&lang=${locale}`;

  if (hasPassword) {
    return `${base}/admin/sign-in?email=${encodeURIComponent(email)}${langParam}`;
  }

  return `${base}/admin/set-password?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(slug)}${langParam}`;
}

export async function POST(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  await ensureAdminAuthSchema();

  const body = await request.json().catch(() => ({}));
  const { salonId, email: rawEmail, locale: rawLocale } = body as {
    salonId?: string;
    email?: string;
    locale?: string;
  };
  const locale: 'bg' | 'en' = rawLocale === 'en' ? 'en' : 'bg';

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

  const customDomain = typeof salon.custom_domain === 'string' ? salon.custom_domain.trim().toLowerCase() : '';

  if (!customDomain) {
    return NextResponse.json(
      { error: 'Салонът няма custom домейн. Запиши домейн и тогава изпрати magic link.' },
      { status: 409 },
    );
  }

  const base = getCustomDomainAdminUrl(customDomain);
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (!hasPassword) {
    await sql`DELETE FROM admin_login_tokens WHERE salon_id = ${salonId}`;
    await sql`
      INSERT INTO admin_login_tokens (salon_id, token_hash, email_norm, expires_at, used_at, created_at)
      VALUES (${salonId}, ${tokenHash}, ${email}, ${expiresAt.toISOString()}, null, now())
    `;

    // Pre-set the salon's UI language to the agency's invite choice so the
    // admin dashboard renders in that language from first login. We only
    // override before the owner has claimed the salon — once they have a
    // password, their own toggle choice is authoritative.
    await sql`
      UPDATE salons
      SET language = ${locale}, updated_at = now()
      WHERE CAST(id AS text) = ${salonId}
    `;
  }

  const magicLink = buildAdminMagicLink({
    base,
    slug,
    token,
    email,
    hasPassword,
    locale,
  });

  const { client, from } = await getSalonResend(salonId, String(salon.name ?? ''));
  if (!client) {
    return NextResponse.json({ ok: true, email, magicLink, emailSent: false });
  }

  const ownerName =
    typeof salon.owner_name === 'string' && salon.owner_name.trim() ? salon.owner_name.trim() : null;

  const copy =
    locale === 'en'
      ? {
          displayName: String(salon.name ?? '').trim() || 'your salon',
          subject: hasPassword ? 'Sign in to your admin panel' : 'Finish your registration',
          heading: hasPassword ? 'Sign in to your panel' : 'Finish your registration',
          greeting: ownerName ? `Hi ${ownerName},` : 'Hi there,',
          body: (name: string) =>
            hasPassword
              ? `Use the button below to sign in to the admin panel for <strong>${name}</strong>.`
              : `Use the button below to set a password and activate the admin panel for <strong>${name}</strong>.`,
          cta: hasPassword ? 'Open panel' : 'Set password',
          addressLabel: 'Panel address',
        }
      : {
          displayName: String(salon.name ?? '').trim() || 'твоят салон',
          subject: hasPassword ? 'Вход в админ панела' : 'Довърши регистрацията си',
          heading: hasPassword ? 'Вход в панела' : 'Довърши регистрацията си',
          greeting: ownerName ? `Здравей, ${ownerName}!` : 'Здравей!',
          body: (name: string) =>
            hasPassword
              ? `Използвай бутона, за да влезеш в админ панела на <strong>${name}</strong>.`
              : `Използвай бутона, за да зададеш парола и да активираш админ панела на <strong>${name}</strong>.`,
          cta: hasPassword ? 'Отвори панела' : 'Задай парола',
          addressLabel: 'Адрес на панела',
        };

  const sendResult = await client.emails
    .send({
      from,
      to: email,
      subject: copy.subject,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">${copy.heading}</h2>
        <p style="line-height: 1.7;">${copy.greeting}</p>
        <p style="line-height: 1.7;">${copy.body(copy.displayName)}</p>
        <p style="margin: 24px 0;">
          <a href="${magicLink}"
             style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:700;font-size:15px;">
            ${copy.cta}
          </a>
        </p>
        <p style="line-height: 1.7; color: #6b7280; font-size: 13px;">
          ${copy.addressLabel}: <strong>${customDomain}/admin</strong>
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
