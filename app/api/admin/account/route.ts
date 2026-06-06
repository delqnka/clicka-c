import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  ADMIN_COOKIE_NAME,
  destroyAllOtherOwnerSessions,
  hashPassword,
  normalizeEmail,
  requireAdminRequestAccess,
  sha256,
  verifyPassword,
} from '@/lib/admin-auth';
import { getPlatformSiteOrigin } from '@/lib/domain-routing';
import {
  sendEmailChangeRequestNotification,
  sendEmailVerificationRequest,
  sendPasswordChangedNotification,
} from '@/lib/resend';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { writeAuditLog } from '@/lib/audit-log';

// 3 email-change requests per hour per IP
const EMAIL_CHANGE_MAX = 3;
const EMAIL_CHANGE_WINDOW_MS = 60 * 60 * 1000;

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Паролата трябва да е поне 8 символа.';
  if (!/[A-Z]/.test(password)) return 'Паролата трябва да съдържа поне една главна буква.';
  if (!/[a-z]/.test(password)) return 'Паролата трябва да съдържа поне една малка буква.';
  if (!/[0-9]/.test(password)) return 'Паролата трябва да съдържа поне една цифра.';
  return null;
}

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

  const rows = await sql`
    SELECT pending_email FROM site_owners WHERE id = ${auth.session.ownerId} LIMIT 1
  `;
  const pendingEmail = String((rows[0] as Record<string, unknown> | undefined)?.pending_email ?? '') || null;

  return NextResponse.json({
    loginEmail: auth.session.ownerEmail,
    hasPassword: Boolean(passwordHash),
    pendingEmail,
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

  if (action === 'password') {
    const newPassword = String(body.newPassword ?? '');
    const confirmPassword = String(body.confirmPassword ?? '');

    const pwErr = validatePasswordStrength(newPassword);
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Паролите не съвпадат' }, { status: 400 });
    }

    const hashed = await hashPassword(newPassword);
    await sql`
      UPDATE site_owners SET password_hash = ${hashed}, updated_at = now()
      WHERE id = ${auth.session.ownerId}
    `;

    // Invalidate all other sessions — if account was compromised, attacker loses access immediately
    const currentSessionId = request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? '';
    if (currentSessionId) {
      await destroyAllOtherOwnerSessions(auth.session.ownerId, currentSessionId);
    }

    // Notify owner that password was changed
    try {
      await sendPasswordChangedNotification(auth.session.ownerEmail);
    } catch {
      // non-fatal — password is already changed
    }

    void writeAuditLog({
      salonId: auth.session.salonId,
      ownerId: auth.session.ownerId,
      action: 'password_changed',
      ip: getClientIp(request as unknown as Request),
    });

    return NextResponse.json({ success: true, message: 'Паролата е сменена.' });
  }

  if (action === 'email') {
    // Email change requires current password confirmation
    if (!currentPassword) {
      return NextResponse.json({ error: 'Въведете текущата парола' }, { status: 400 });
    }
    const passwordHash = await getOwnerPasswordHash(auth.session.ownerId);
    if (passwordHash) {
      const validCurrent = await verifyPassword(currentPassword, passwordHash);
      if (!validCurrent) {
        return NextResponse.json({ error: 'Грешна текуща парола' }, { status: 401 });
      }
    }

    const ip = getClientIp(request as unknown as Request);
    const rl = await checkRateLimit('account-email-change', ip, EMAIL_CHANGE_MAX, EMAIL_CHANGE_WINDOW_MS);
    if (rl.limited) {
      return NextResponse.json(
        { error: 'Твърде много заявки за смяна на имейл. Опитайте след един час.' },
        { status: 429 },
      );
    }

    const newEmail = normalizeEmail(String(body.newEmail ?? ''));
    if (!newEmail) {
      return NextResponse.json({ error: 'Въведете валиден имейл' }, { status: 400 });
    }

    const currentNorm = normalizeEmail(auth.session.ownerEmail);
    const submittedCurrent = normalizeEmail(String(body.currentEmail ?? ''));
    if (submittedCurrent && submittedCurrent !== currentNorm) {
      return NextResponse.json({ error: 'Текущият имейл не съвпада. Презаредете страницата.' }, { status: 400 });
    }

    if (newEmail === currentNorm) {
      return NextResponse.json({ error: 'Това е текущият имейл за вход' }, { status: 400 });
    }

    const taken = await sql`
      SELECT id FROM site_owners WHERE email_norm = ${newEmail} AND id <> ${auth.session.ownerId} LIMIT 1
    `;
    if (taken.length > 0) {
      return NextResponse.json({ error: 'Този имейл вече се използва от друг акаунт' }, { status: 409 });
    }

    // Store pending email with verification token (30 min expiry)
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await sql`
      UPDATE site_owners
      SET pending_email = ${newEmail},
          pending_email_token_hash = ${tokenHash},
          pending_email_expires_at = ${expiresAt.toISOString()},
          updated_at = now()
      WHERE id = ${auth.session.ownerId}
    `;

    const salonSlug = slug ?? auth.session.ownerId;
    const base = getPlatformSiteOrigin(salonSlug);
    const verifyUrl = `${base}/api/admin/verify-email?token=${encodeURIComponent(token)}&owner=${encodeURIComponent(auth.session.ownerId)}`;

    // Send verification link to new email + notification to old email
    try {
      await Promise.all([
        sendEmailVerificationRequest(newEmail, verifyUrl),
        sendEmailChangeRequestNotification(auth.session.ownerEmail, newEmail),
      ]);
    } catch {
      // non-fatal — pending email is saved, user can retry
    }

    void writeAuditLog({
      salonId: auth.session.salonId,
      ownerId: auth.session.ownerId,
      action: 'email_change_requested',
      detail: { newEmail },
      ip: getClientIp(request as unknown as Request),
    });

    return NextResponse.json({
      success: true,
      message: `Изпратихме верификационен линк на ${newEmail}. Имейлът ви ще се смени след потвърждение.`,
      pendingEmail: newEmail,
    });
  }

  return NextResponse.json({ error: 'Невалидно действие' }, { status: 400 });
}
