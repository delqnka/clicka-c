import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, destroyOwnerSession, getAdminSessionByCookieValue } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit-log';

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? '';
  if (sessionId) {
    // Read session before destroying so we can log it
    const slug = request.headers.get('x-salon-slug') ?? '';
    const session = slug ? await getAdminSessionByCookieValue(sessionId, slug).catch(() => null) : null;
    await destroyOwnerSession(sessionId);
    if (session) {
      void writeAuditLog({
        salonId: session.salonId,
        ownerId: session.ownerId,
        action: 'sign_out',
        ip: request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null,
      });
    }
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    expires: new Date(0),
  });
  return res;
}

