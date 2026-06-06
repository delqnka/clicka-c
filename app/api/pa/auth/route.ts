import { NextRequest, NextResponse } from 'next/server';
import {
  verifyCredentials,
  setPlatformAdminCookie,
  clearPlatformAdminCookie,
  isPlatformAdminRequest,
} from '@/lib/platform-admin-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { checkCsrfOrigin } from '@/lib/csrf';

// 5 attempts per 15 minutes per IP — platform admin is high-value target
const PA_MAX = 5;
const PA_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const csrfErr = await checkCsrfOrigin(request);
  if (csrfErr) return NextResponse.json({ error: csrfErr }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { email, password, action } = body as { email?: string; password?: string; action?: string };

  if (action === 'logout') {
    const response = NextResponse.json({ ok: true });
    return clearPlatformAdminCookie(response, request);
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Липсва имейл или парола' }, { status: 400 });
  }

  const ip = getClientIp(request as unknown as Request);
  const rl = await checkRateLimit('platform-admin-auth', ip, PA_MAX, PA_WINDOW_MS);
  if (rl.limited) {
    return NextResponse.json(
      { error: 'Твърде много опити. Опитайте отново след 15 минути.' },
      { status: 429 },
    );
  }

  if (!(await verifyCredentials(email, password))) {
    return NextResponse.json({ error: 'Грешен имейл или парола' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  return setPlatformAdminCookie(response, request);
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ ok: await isPlatformAdminRequest(request) });
}
