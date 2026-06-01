import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sql } from '@/lib/db';
import { Resend } from 'resend';
import {
  ensureAdminAuthSchema,
  getPrimaryOwnerForSalon,
  normalizeEmail,
  resolveSalonBySlugOrHost,
  sha256,
} from '@/lib/admin-auth';
import { getPlatformSiteOrigin } from '@/lib/domain-routing';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { checkCsrfOrigin } from '@/lib/csrf';

const resend = new Resend(process.env.RESEND_API_KEY);

// 5 password-reset emails per hour per IP
const RESET_MAX = 5;
const RESET_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const csrfErr = checkCsrfOrigin(request);
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

  // Resolve only from Host header — never trust client-supplied x-salon-slug.
  // body.slug is still accepted because the token validates ownership anyway.
  const salon = await resolveSalonBySlugOrHost({
    slug: body.slug || undefined,
    host: request.headers.get('host'),
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

  const base = getPlatformSiteOrigin(salon.slug);
  const resetUrl = `${base}/admin/set-password?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(salon.slug)}`;

  await resend.emails.send({
    from: 'Clicka.bg <noreply@clicka.bg>',
    to: allowedEmail,
    subject: `Задай нова парола`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">Задай нова парола</h2>
        <p style="line-height: 1.7;">Натисни бутона, за да зададеш нова парола за панела.</p>
        <p style="margin: 20px 0;">
          <a href="${resetUrl}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:700;font-size:15px;">
            Задай парола →
          </a>
        </p>
        <p style="color:#999;font-size:13px;line-height:1.5;">
          Линкът е валиден 15 минути. Ако не си поискал нова парола, игнорирай имейла.
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}

