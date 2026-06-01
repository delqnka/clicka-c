import { NextRequest, NextResponse } from 'next/server';
import {
  verifyCredentials,
  setPlatformAdminCookie,
  clearPlatformAdminCookie,
  isPlatformAdminRequest,
} from '@/lib/platform-admin-auth';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { email, password, action } = body as { email?: string; password?: string; action?: string };

  if (action === 'logout') {
    const response = NextResponse.json({ ok: true });
    return clearPlatformAdminCookie(response);
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Липсва имейл или парола' }, { status: 400 });
  }

  if (!verifyCredentials(email, password)) {
    return NextResponse.json({ error: 'Грешен имейл или парола' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  return setPlatformAdminCookie(response, request);
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ ok: isPlatformAdminRequest(request) });
}
