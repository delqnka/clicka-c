import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { sql } from '@/lib/db';
import {
  ensureAdminAuthSchema,
  generateOtpCode,
  getPrimaryOwnerForSalon,
  hashOtpCode,
  normalizeEmail,
  resolveSalonBySlugOrHost,
} from '@/lib/admin-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY);

// 5 OTP sends per hour per IP
const OTP_MAX = 5;
const OTP_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request as unknown as Request);
  const rl = await checkRateLimit('claim-send-otp', ip, OTP_MAX, OTP_WINDOW_MS);
  if (rl.limited) {
    return NextResponse.json(
      { error: 'Твърде много заявки. Опитайте отново след един час.' },
      { status: 429 },
    );
  }

  await ensureAdminAuthSchema();

  let body: { slug?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const emailNorm = normalizeEmail(body.email ?? '');
  if (!emailNorm) {
    return NextResponse.json({ error: 'Липсва имейл.' }, { status: 400 });
  }

  const salon = await resolveSalonBySlugOrHost({
    slug: body.slug ?? request.headers.get('x-salon-slug'),
    host: request.headers.get('host'),
    includeInactive: true,
  });
  if (!salon) {
    return NextResponse.json({ error: 'Салонът не е намерен.' }, { status: 404 });
  }

  const primaryOwner = await getPrimaryOwnerForSalon(salon.salonId);
  const allowedEmail = normalizeEmail(primaryOwner?.email ?? salon.email ?? '');
  if (!allowedEmail || allowedEmail !== emailNorm) {
    return NextResponse.json(
      { error: 'Имейлът трябва да съвпада с имейла на собственика на сайта.' },
      { status: 400 }
    );
  }

  const recentRows = await sql`
    SELECT created_at
    FROM salon_claim_otp
    WHERE salon_id = ${salon.salonId} AND email_norm = ${emailNorm}
    LIMIT 1
  `;
  if (recentRows.length > 0) {
    const createdAt = new Date(String((recentRows[0] as Record<string, unknown>).created_at ?? ''));
    if (!Number.isNaN(createdAt.getTime()) && Date.now() - createdAt.getTime() < 45_000) {
      return NextResponse.json(
        { error: 'Изчакайте малко преди да поискате нов код.' },
        { status: 429 }
      );
    }
  }

  const code = generateOtpCode();
  const codeHash = hashOtpCode(emailNorm, code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Debug bypass — only permitted outside production to prevent auth bypass
  const skipCheckoutMode =
    process.env.NODE_ENV !== 'production' &&
    (process.env.CLICKA_SKIP_CHECKOUT === '1' ||
      process.env.CLICKA_SKIP_CHECKOUT === 'true');

  await sql`
    INSERT INTO salon_claim_otp (salon_id, email_norm, code_hash, expires_at, attempts, created_at)
    VALUES (${salon.salonId}, ${emailNorm}, ${codeHash}, ${expiresAt.toISOString()}, 0, now())
    ON CONFLICT (salon_id, email_norm)
    DO UPDATE SET
      code_hash = EXCLUDED.code_hash,
      expires_at = EXCLUDED.expires_at,
      attempts = 0,
      created_at = now()
  `;

  if (skipCheckoutMode) {
    // Never expose code to client — log server-side only in dev
    console.log(`[dev] OTP for ${emailNorm}: ${code}`);
    return NextResponse.json({ success: true });
  }

  const sendResult = await resend.emails.send({
    from: 'Clicka.bg <noreply@clicka.bg>',
    to: allowedEmail,
    subject: `Код за достъп до ${salon.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #111; margin-bottom: 12px;">Код за claim на сайта</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #222;">
          Въведете този код, за да активирате собствения си dashboard за <strong>${salon.name}</strong>.
        </p>
        <div style="margin: 24px 0; padding: 18px 20px; border-radius: 16px; background: #111; color: #fff; font-size: 34px; font-weight: 800; letter-spacing: 0.24em; text-align: center;">
          ${code}
        </div>
        <p style="font-size: 13px; color: #555; line-height: 1.6;">
          Кодът е валиден 10 минути. Ако не сте поискали този код, просто игнорирайте имейла.
        </p>
      </div>
    `,
  });

  if (sendResult.error) {
    return NextResponse.json(
      { error: 'Не успяхме да изпратим кода по имейл.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
