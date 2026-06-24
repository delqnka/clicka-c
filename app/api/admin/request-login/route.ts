import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sql } from '@/lib/db';
import {
  ensureAdminAuthSchema,
  getPrimaryOwnerForSalon,
  normalizeEmail,
  resolveSalonBySlugOrHost,
  sha256,
} from '@/lib/admin-auth';
import { getBrowserHost, getCustomDomainAdminUrl, isSalonCustomDomainUsable } from '@/lib/domain-routing';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { checkCsrfOrigin } from '@/lib/csrf';
import { getSalonResend } from '@/lib/resend';

// 5 password-reset emails per hour per IP
const RESET_MAX = 5;
const RESET_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const csrfErr = await checkCsrfOrigin(request);
  if (csrfErr) return NextResponse.json({ error: csrfErr }, { status: 403 });

  const ip = getClientIp(request as unknown as Request);
  const rl = await checkRateLimit('admin-request-login', ip, RESET_MAX, RESET_WINDOW_MS);
  if (rl.limited) {
    return NextResponse.json(
      { error: 'Твърде много заявки. Опитайте отново след един час.' },
      { status: 429 },
    );
  }

  await ensureAdminAuthSchema();

  let body: { email?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? '');
  if (!email) return NextResponse.json({ error: 'Липсва имейл' }, { status: 400 });

  // Resolve from the browser-facing host (x-forwarded-host when the request
  // comes via a client-site proxy). Never trust client-supplied x-salon-slug.
  // body.slug is still accepted because the token validates ownership anyway.
  const salon = await resolveSalonBySlugOrHost({
    slug: body.slug || undefined,
    host: getBrowserHost(request.headers),
    includeInactive: true,
  });
  if (!salon) return NextResponse.json({ error: 'Салонът не е намерен' }, { status: 404 });

  const primaryOwner = await getPrimaryOwnerForSalon(salon.salonId);
  const allowedEmail = normalizeEmail(primaryOwner?.email ?? salon.email ?? '');
  if (!allowedEmail || allowedEmail !== email) {
    return NextResponse.json({ success: true });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  // Requires DB table admin_login_tokens (see below).
  await sql`DELETE FROM admin_login_tokens WHERE salon_id = ${salon.salonId}`;
  await sql`
    INSERT INTO admin_login_tokens (salon_id, token_hash, email_norm, expires_at, used_at, created_at)
    VALUES (${salon.salonId}, ${tokenHash}, ${allowedEmail}, ${expiresAt.toISOString()}, null, now())
  `;

  const activeCustomDomain = isSalonCustomDomainUsable({
    customDomain: salon.customDomain,
    domainStatus: salon.domainStatus,
  })
    ? (salon.customDomain ?? '').trim().toLowerCase()
    : null;
  if (!activeCustomDomain) {
    return NextResponse.json(
      { error: 'Салонът няма custom домейн готов за ползване.' },
      { status: 409 },
    );
  }
  const base = getCustomDomainAdminUrl(activeCustomDomain);
  const resetUrl = `${base}/admin/set-password?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(salon.slug)}&mode=reset`;

  const { client, from, locale } = await getSalonResend(salon.salonId, salon.name);
  if (!client) {
    return NextResponse.json({ error: 'Имейл услугата не е конфигурирана.' }, { status: 503 });
  }
  const isEn = locale === 'en';

  await client.emails.send({
    from,
    to: allowedEmail,
    subject: isEn ? 'Set a new password' : `Задай нова парола`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">${isEn ? 'Set a new password' : 'Задай нова парола'}</h2>
        <p style="line-height: 1.7;">${isEn ? 'Use the button below to set a new password for your panel.' : 'Натисни бутона, за да зададеш нова парола за панела.'}</p>
        <p style="margin: 20px 0;">
          <a href="${resetUrl}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:700;font-size:15px;">
            ${isEn ? 'Set password →' : 'Задай парола →'}
          </a>
        </p>
        <p style="color:#999;font-size:13px;line-height:1.5;">
          ${isEn ? 'The link is valid for 15 minutes. If you did not request a new password, ignore this email.' : 'Линкът е валиден 15 минути. Ако не си поискал нова парола, игнорирай имейла.'}
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
