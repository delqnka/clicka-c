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

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  await ensureAdminAuthSchema();

  let body: { email?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? '');
  if (!email) return NextResponse.json({ error: 'Липсва имейл' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const slugFromHeader = request.headers.get('x-salon-slug');
  const salon = await resolveSalonBySlugOrHost({
    slug: body.slug || slugFromHeader || searchParams.get('slug'),
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

  const host = request.headers.get('host') ?? '';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const base = `${protocol}://${host}`;
  const verifyUrl = `${base}/api/admin/verify?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(salon.slug)}`;

  await resend.emails.send({
    from: 'Clicka.bg <noreply@clicka.bg>',
    to: allowedEmail,
    subject: `Вход за админ – ${salon.name ?? salon.slug}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #111;">Линк за вход</h2>
        <p>Натиснете бутона, за да влезете в контролния панел.</p>
        <p style="margin: 18px 0;">
          <a href="${verifyUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;">
            Влез в админ панела →
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px;line-height:1.5;">
          Линкът е валиден 15 минути. Ако не сте поискали този вход, игнорирайте имейла.
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}

