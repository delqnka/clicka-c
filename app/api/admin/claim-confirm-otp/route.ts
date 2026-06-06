import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  createOwnerSession,
  ensureAdminAuthSchema,
  ensureOwnerForSalon,
  generateAdminMagicLink,
  getPrimaryOwnerForSalon,
  hashOtpCode,
  normalizeEmail,
  resolveSalonBySlugOrHost,
  setAdminSessionCookie,
} from '@/lib/admin-auth';
import { getHostAwareSalonPath } from '@/lib/domain-routing';

export async function POST(request: NextRequest) {
  await ensureAdminAuthSchema();

  let body: { slug?: string; email?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const emailNorm = normalizeEmail(body.email ?? '');
  const code = String(body.code ?? '').trim();
  if (!emailNorm || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Въведете валиден 6-цифрен код.' }, { status: 400 });
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
      { error: 'Този имейл няма право да claim-не сайта.' },
      { status: 400 }
    );
  }

  const otpRows = await sql`
    SELECT id, code_hash, expires_at, attempts
    FROM salon_claim_otp
    WHERE salon_id = ${salon.salonId} AND email_norm = ${emailNorm}
    LIMIT 1
  `;

  if (otpRows.length === 0) {
    return NextResponse.json({ error: 'Няма активен код за този имейл.' }, { status: 404 });
  }

  const otp = otpRows[0] as Record<string, unknown>;
  const expiresAt = new Date(String(otp.expires_at ?? ''));
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    await sql`DELETE FROM salon_claim_otp WHERE id = ${String(otp.id ?? '')}`;
    return NextResponse.json({ error: 'Кодът е изтекъл. Поискайте нов.' }, { status: 400 });
  }

  if (Number(otp.attempts ?? 0) >= 5) {
    await sql`DELETE FROM salon_claim_otp WHERE id = ${String(otp.id ?? '')}`;
    return NextResponse.json({ error: 'Твърде много опити. Поискайте нов код.' }, { status: 429 });
  }

  const expectedHash = hashOtpCode(emailNorm, code);
  if (expectedHash !== String(otp.code_hash ?? '')) {
    await sql`
      UPDATE salon_claim_otp
      SET attempts = attempts + 1
      WHERE id = ${String(otp.id ?? '')}
    `;
    return NextResponse.json({ error: 'Кодът е грешен.' }, { status: 400 });
  }

  await sql`DELETE FROM salon_claim_otp WHERE id = ${String(otp.id ?? '')}`;

  const owner =
    primaryOwner ??
    (await ensureOwnerForSalon({
      salonId: salon.salonId,
      email: emailNorm,
    }));

  // Провери дали потребителят има зададена парола
  const ownerRow = await sql`
    SELECT password_hash FROM site_owners WHERE id = ${owner.ownerId} LIMIT 1
  `;
  const hasPassword = !!(ownerRow[0] as Record<string, unknown>)?.password_hash;

  if (!hasPassword) {
    // Нов потребител — прати magic link за задаване на парола
    const magicLink = await generateAdminMagicLink({
      salonId: salon.salonId,
      slug: salon.slug,
      email: emailNorm,
      expiresMs: 60 * 60 * 1000, // 1 час
    });
    return NextResponse.json({ success: true, redirectTo: magicLink, isNewUser: true });
  }

  // Съществуващ потребител с парола — създай сесия и прати към admin
  const { sessionId, sessionExpires } = await createOwnerSession({
    salonId: salon.salonId,
    ownerId: owner.ownerId,
  });

  const host = request.headers.get('host') ?? '';
  const redirectTo = getHostAwareSalonPath({ host, slug: salon.slug, path: 'admin' });

  const response = NextResponse.json({ success: true, redirectTo });
  setAdminSessionCookie(response, request, sessionId, sessionExpires);
  return response;
}
