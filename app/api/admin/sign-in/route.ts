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

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  const salon = await resolveSalonBySlugOrHost({
    slug: request.headers.get('x-salon-slug'),
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
    return NextResponse.json({ error: 'Грешен имейл или парола' }, { status: 401 });
  }

  const { sessionId, sessionExpires } = await createOwnerSession({
    salonId: salon.salonId,
    ownerId: owner.ownerId,
  });

  const res = NextResponse.json({ success: true });
  setAdminSessionCookie(res, request, sessionId, sessionExpires);
  return res;
}
