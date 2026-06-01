import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const PLATFORM_ADMIN_COOKIE = 'clicka_platform_admin';

function getSecret(): string {
  const s = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!s) throw new Error('PLATFORM_ADMIN_PASSWORD не е зададена');
  return s;
}

function makeTokenHash(token: string): string {
  return crypto.createHash('sha256').update(token + getSecret()).digest('hex');
}

export function generatePlatformAdminToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function verifyPlatformAdminToken(token: string): boolean {
  try {
    const expected = makeTokenHash(token.split('.')[0]);
    const actual = token.split('.')[1];
    if (!expected || !actual) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
  } catch {
    return false;
  }
}

export function buildPlatformAdminToken(): string {
  const rand = crypto.randomBytes(32).toString('hex');
  const hash = makeTokenHash(rand);
  return `${rand}.${hash}`;
}

export function verifyCredentials(email: string, password: string): boolean {
  try {
    const expectedEmail = process.env.PLATFORM_ADMIN_EMAIL ?? '';
    const expectedPassword = getSecret();
    if (!expectedEmail) return false;

    const emailOk = crypto.timingSafeEqual(
      Buffer.from(email.trim().toLowerCase()),
      Buffer.from(expectedEmail.trim().toLowerCase())
    );
    const passwordOk = crypto.timingSafeEqual(
      Buffer.from(password),
      Buffer.from(expectedPassword)
    );
    return emailOk && passwordOk;
  } catch {
    return false;
  }
}

export function isPlatformAdminRequest(request: NextRequest): boolean {
  const token = request.cookies.get(PLATFORM_ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyPlatformAdminToken(token);
}

export function isPlatformAdminSession(): boolean {
  try {
    const token = cookies().get(PLATFORM_ADMIN_COOKIE)?.value;
    if (!token) return false;
    return verifyPlatformAdminToken(token);
  } catch {
    return false;
  }
}

export function setPlatformAdminCookie(response: NextResponse, request: NextRequest) {
  const token = buildPlatformAdminToken();
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
  response.cookies.set({
    name: PLATFORM_ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    expires,
  });
  return response;
}

export function clearPlatformAdminCookie(response: NextResponse) {
  response.cookies.set({
    name: PLATFORM_ADMIN_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
  return response;
}
