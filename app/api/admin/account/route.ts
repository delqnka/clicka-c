import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  hashPassword,
  normalizeEmail,
  requireAdminRequestAccess,
  verifyPassword,
} from '@/lib/admin-auth';

async function getOwnerPasswordHash(ownerId: string): Promise<string> {
  const rows = await sql`
    SELECT password_hash FROM site_owners WHERE id = ${ownerId} LIMIT 1
  `;
  return String((rows[0] as Record<string, unknown> | undefined)?.password_hash ?? '');
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const passwordHash = await getOwnerPasswordHash(auth.session.ownerId);
  return NextResponse.json({
    loginEmail: auth.session.ownerEmail,
    hasPassword: Boolean(passwordHash),
  });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const action = String(body.action ?? '').trim();
  const currentPassword = String(body.currentPassword ?? '');

  if (!currentPassword) {
    return NextResponse.json({ error: 'Въведете текущата парола' }, { status: 400 });
  }

  const passwordHash = await getOwnerPasswordHash(auth.session.ownerId);
  if (!passwordHash) {
    return NextResponse.json(
      { error: 'Паролата не е зададена. Използвайте „Забравена парола?“ на страницата за вход.' },
      { status: 400 },
    );
  }

  const validCurrent = await verifyPassword(currentPassword, passwordHash);
  if (!validCurrent) {
    return NextResponse.json({ error: 'Грешна текуща парола' }, { status: 401 });
  }

  if (action === 'password') {
    const newPassword = String(body.newPassword ?? '');
    const confirmPassword = String(body.confirmPassword ?? '');

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Новата парола трябва да е поне 8 символа' }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Паролите не съвпадат' }, { status: 400 });
    }

    const hashed = await hashPassword(newPassword);
    await sql`
      UPDATE site_owners SET password_hash = ${hashed}, updated_at = now()
      WHERE id = ${auth.session.ownerId}
    `;

    return NextResponse.json({ success: true, message: 'Паролата е сменена.' });
  }

  if (action === 'email') {
    const newEmail = normalizeEmail(String(body.newEmail ?? ''));
    if (!newEmail) {
      return NextResponse.json({ error: 'Въведете валиден имейл' }, { status: 400 });
    }

    const currentNorm = normalizeEmail(auth.session.ownerEmail);
    if (newEmail === currentNorm) {
      return NextResponse.json({ error: 'Това е текущият имейл за вход' }, { status: 400 });
    }

    const taken = await sql`
      SELECT id FROM site_owners WHERE email_norm = ${newEmail} AND id <> ${auth.session.ownerId} LIMIT 1
    `;
    if (taken.length > 0) {
      return NextResponse.json({ error: 'Този имейл вече се използва от друг акаунт' }, { status: 409 });
    }

    await sql`
      UPDATE site_owners
      SET email = ${newEmail}, email_norm = ${newEmail}, updated_at = now()
      WHERE id = ${auth.session.ownerId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Имейлът за вход е сменен.',
      loginEmail: newEmail,
    });
  }

  return NextResponse.json({ error: 'Невалидно действие' }, { status: 400 });
}
