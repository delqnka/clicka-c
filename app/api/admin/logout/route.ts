import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'clicka_admin_session';

export async function POST(request: NextRequest) {
  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    expires: new Date(0),
  });
  return res;
}

