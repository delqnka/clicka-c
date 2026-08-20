import { NextRequest, NextResponse } from 'next/server';

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Паролата трябва да е поне 8 символа.';
  if (!/[A-Z]/.test(password)) return 'Паролата трябва да съдържа поне една главна буква.';
  if (!/[a-z]/.test(password)) return 'Паролата трябва да съдържа поне една малка буква.';
  if (!/[0-9]/.test(password)) return 'Паролата трябва да съдържа поне една цифра.';
  return null;
}

function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

import { sql } from '@/lib/db';
import {
  createOwnerSession,
  ensureAdminAuthSchema,
  hashPassword,
  normalizeEmail,
  setAdminSessionCookie,
  sha256,
  transferSalonOwnerToEmail,
} from '@/lib/admin-auth';
import { sendSiteReadyEmail } from '@/lib/site-ready-email';

export async function POST(request: NextRequest): Promise<NextResponse> {
  await ensureAdminAuthSchema();

  let body: { token?: string; slug?: string; password?: string; confirmPassword?: string; displayName?: string };
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
  const displayName = normalizeDisplayName(String(body.displayName ?? ''));

  if (!token || !slug) {
    return NextResponse.json({ error: 'Невалиден линк' }, { status: 400 });
  }

  const pwErr = validatePasswordStrength(password);
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Паролите не съвпадат' }, { status: 400 });
  }
  // Validate token
  const salons = await sql`
    SELECT CAST(id AS text) AS salon_id, slug, email, name, owner_name
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
  const tokenEmail = normalizeEmail(String(row.email_norm ?? salonEmail));
  const owner = await transferSalonOwnerToEmail({ salonId, email: tokenEmail || salonEmail });

  const existingHashRows = await sql`
    SELECT password_hash, display_name FROM site_owners WHERE id = ${owner.ownerId} LIMIT 1
  `;
  const isFirstTimeSetup = !String((existingHashRows[0] as Record<string, unknown>)?.password_hash ?? '');
  const existingDisplayName = String((existingHashRows[0] as Record<string, unknown>)?.display_name ?? '').trim();
  const nextDisplayName = displayName || existingDisplayName;

  if (!nextDisplayName || nextDisplayName.length < 2) {
    return NextResponse.json({ error: 'Въведете име от поне 2 символа' }, { status: 400 });
  }
  if (nextDisplayName.length > 80) {
    return NextResponse.json({ error: 'Името е твърде дълго' }, { status: 400 });
  }

  // Save hashed password
  const hashed = await hashPassword(password);
  await sql`
    UPDATE site_owners
    SET password_hash = ${hashed}, display_name = ${nextDisplayName}, updated_at = now()
    WHERE id = ${owner.ownerId}
  `;

  // First time the owner sets a password — that's when their site is truly
  // ready to use, so send the "site is ready" email with the panel link now.
  if (isFirstTimeSetup) {
    await sendSiteReadyEmail({
      salonId,
      slug,
      email: tokenEmail || salonEmail,
      name: String(salon.name ?? ''),
      ownerName: String(salon.owner_name ?? ''),
    }).catch(() => {});
  }

  // Create session
  const { sessionId, sessionExpires } = await createOwnerSession({
    salonId,
    ownerId: owner.ownerId,
  });

  const res = NextResponse.json({ success: true });
  setAdminSessionCookie(res, request, sessionId, sessionExpires);
  return res;
}
