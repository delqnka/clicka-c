import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  createOwnerSession,
  ensureAdminAuthSchema,
  ensureOwnerForSalon,
  getPrimaryOwnerForSalon,
  hashPassword,
  normalizeEmail,
  setAdminSessionCookie,
  sha256,
} from '@/lib/admin-auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  await ensureAdminAuthSchema();

  let body: { token?: string; slug?: string; password?: string; confirmPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const token = String(body.token ?? '').trim();
  const slug =
    String(body.slug ?? '').trim() ||
    (request.headers.get('x-salon-slug') ?? '');
  const password = String(body.password ?? '');
  const confirmPassword = String(body.confirmPassword ?? '');

  if (!token || !slug) {
    return NextResponse.json({ error: 'Невалиден линк' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Паролата трябва да е поне 8 символа' }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Паролите не съвпадат' }, { status: 400 });
  }

  // Validate token
  const salons = await sql`
    SELECT CAST(id AS text) AS salon_id, slug, email
    FROM salons
    WHERE slug = ${slug} AND is_active = true
    LIMIT 1
  `;
  if (salons.length === 0) {
    return NextResponse.json({ error: 'Невалиден линк' }, { status: 400 });
  }
  const salon = salons[0] as Record<string, unknown>;
  const salonId = String(salon.salon_id ?? '');

  const tokenHash = sha256(token);
  const tokens = await sql`
    SELECT id, expires_at, used_at, email_norm
    FROM admin_login_tokens
    WHERE salon_id = ${salonId} AND token_hash = ${tokenHash}
    LIMIT 1
  `;

  if (tokens.length === 0) {
    return NextResponse.json({ error: 'Линкът е невалиден или вече е използван' }, { status: 400 });
  }

  const row = tokens[0] as Record<string, unknown>;
  const expiresAt = new Date(String(row.expires_at ?? ''));
  if (row.used_at || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Линкът е изтекъл. Поискайте нов от „Забравена парола?"' }, { status: 400 });
  }

  // Mark token used
  await sql`UPDATE admin_login_tokens SET used_at = now() WHERE id = ${row.id}`;

  // Ensure owner exists for this salon
  const salonEmail = String(salon.email ?? '');
  const tokenEmail = String(row.email_norm ?? salonEmail);
  const owner =
    (await getPrimaryOwnerForSalon(salonId)) ??
    (await ensureOwnerForSalon({ salonId, email: tokenEmail || salonEmail }));

  // Save hashed password
  const hashed = await hashPassword(password);
  await sql`
    UPDATE site_owners SET password_hash = ${hashed}, updated_at = now()
    WHERE id = ${owner.ownerId}
  `;

  // Create session
  const { sessionId, sessionExpires } = await createOwnerSession({
    salonId,
    ownerId: owner.ownerId,
  });

  const res = NextResponse.json({ success: true });
  setAdminSessionCookie(res, request, sessionId, sessionExpires);
  return res;
}
