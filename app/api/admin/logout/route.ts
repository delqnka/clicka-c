import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, destroyOwnerSession } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? '';
  if (sessionId) {
    await destroyOwnerSession(sessionId);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    expires: new Date(0),
  });
  return res;
}

