import { NextRequest, NextResponse } from 'next/server';
import {
  createOwnerSession,
  ensureAdminAuthSchema,
  getPrimaryOwnerForSalon,
  normalizeEmail,
  resolveSalonBySlugOrHost,
  setAdminSessionCookie,
  verifyPassword,
} from '@/lib/admin-auth';
import { sql } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { checkCsrfOrigin } from '@/lib/csrf';
import { writeAuditLog } from '@/lib/audit-log';

// 10 attempts per 15 minutes per IP
const SIGN_IN_MAX = 10;
const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const csrfErr = checkCsrfOrigin(request);
  if (csrfErr) return NextResponse.json({ error: csrfErr }, { status: 403 });

  const ip = getClientIp(request as unknown as Request);
  const rl = await checkRateLimit('admin-sign-in', ip, SIGN_IN_MAX, SIGN_IN_WINDOW_MS);
  if (rl.limited) {
    return NextResponse.json(
      { error: 'Твърде много опити. Опитайте отново след 15 минути.' },
      { status: 429 },
    );
  }

  await ensureAdminAuthSchema();

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? '');
  const password = String(body.password ?? '').trim();

  if (!email || !password) {
    return NextResponse.json({ error: 'Въведете имейл и парола' }, { status: 400 });
  }

  // Resolve salon only from the DNS-controlled Host header.
  // Never trust x-salon-slug here — it can be forged on direct API calls.
  const salon = await resolveSalonBySlugOrHost({
    host: request.headers.get('host'),
    includeInactive: false,
  });

  if (!salon) {
    return NextResponse.json({ error: 'Грешен имейл или парола' }, { status: 401 });
  }

  const owner = await getPrimaryOwnerForSalon(salon.salonId);
  if (!owner || normalizeEmail(owner.email) !== email) {
    return NextResponse.json({ error: 'Грешен имейл или парола' }, { status: 401 });
  }

  const ownerRows = await sql`
    SELECT password_hash FROM site_owners WHERE id = ${owner.ownerId} LIMIT 1
  `;
  const passwordHash = String((ownerRows[0] as Record<string, unknown>)?.password_hash ?? '');

  if (!passwordHash) {
    return NextResponse.json(
      { error: 'Паролата не е зададена. Използвайте „Забравена парола?" за да зададете нова.' },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, passwordHash);
  if (!valid) {
    void writeAuditLog({ salonId: salon.salonId, ownerId: owner.ownerId, action: 'sign_in_failed', ip });
    return NextResponse.json({ error: 'Грешен имейл или парола' }, { status: 401 });
  }

  const { sessionId, sessionExpires } = await createOwnerSession({
    salonId: salon.salonId,
    ownerId: owner.ownerId,
  });

  void writeAuditLog({ salonId: salon.salonId, ownerId: owner.ownerId, action: 'sign_in', ip });

  const res = NextResponse.json({ success: true });
  setAdminSessionCookie(res, request, sessionId, sessionExpires);
  return res;
}
