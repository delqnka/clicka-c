import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const PLATFORM_ADMIN_COOKIE = 'clicka_platform_admin';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS platform_admin_sessions (
      id          bigserial    PRIMARY KEY,
      token_hash  text         NOT NULL UNIQUE,
      expires_at  timestamptz  NOT NULL,
      created_at  timestamptz  NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS platform_admin_sessions_token_hash_idx
    ON platform_admin_sessions (token_hash)
  `;
  schemaReady = true;
}

// ---------------------------------------------------------------------------
// Password verification
// Supports two modes:
//   1. PLATFORM_ADMIN_PASSWORD_HASH — scrypt hash (salt:hash), preferred.
//   2. PLATFORM_ADMIN_PASSWORD     — plaintext fallback for existing deploys.
// ---------------------------------------------------------------------------

function getRawPassword(): string {
  const s = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!s) throw new Error('PLATFORM_ADMIN_PASSWORD не е зададена');
  return s;
}

async function verifyPasswordValue(input: string): Promise<boolean> {
  const storedHash = process.env.PLATFORM_ADMIN_PASSWORD_HASH?.trim();

  if (storedHash) {
    // scrypt format: "<salt>:<hex-hash>"  (same as user passwords)
    const colonIdx = storedHash.indexOf(':');
    if (colonIdx === -1) return false;
    const salt = storedHash.slice(0, colonIdx);
    const expectedHex = storedHash.slice(colonIdx + 1);
    return new Promise((resolve) => {
      crypto.scrypt(input, salt, 64, (err, buf) => {
        if (err) { resolve(false); return; }
        try {
          resolve(crypto.timingSafeEqual(buf, Buffer.from(expectedHex, 'hex')));
        } catch { resolve(false); }
      });
    });
  }

  // Plaintext fallback — warn so ops know to migrate
  if (process.env.NODE_ENV === 'production') {
    console.warn('[security] PLATFORM_ADMIN_PASSWORD_HASH не е зададена — използва се plaintext парола. Генерирайте хеш с /api/pa/hash-password.');
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(input), Buffer.from(getRawPassword()));
  } catch { return false; }
}

export async function verifyCredentials(email: string, password: string): Promise<boolean> {
  const expectedEmail = (process.env.PLATFORM_ADMIN_EMAIL ?? '').trim().toLowerCase();
  if (!expectedEmail) return false;

  try {
    const emailOk = crypto.timingSafeEqual(
      Buffer.from(email.trim().toLowerCase()),
      Buffer.from(expectedEmail),
    );
    if (!emailOk) return false;
  } catch { return false; }

  return verifyPasswordValue(password);
}

// ---------------------------------------------------------------------------
// Session token — stored as SHA-256 hash in DB (server-side revocation)
// ---------------------------------------------------------------------------

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function storeSessionToken(tokenHash: string, expiresAt: Date) {
  await ensureSchema();
  // Clean expired sessions lazily
  await sql`DELETE FROM platform_admin_sessions WHERE expires_at < now()`;
  await sql`
    INSERT INTO platform_admin_sessions (token_hash, expires_at)
    VALUES (${tokenHash}, ${expiresAt.toISOString()})
    ON CONFLICT (token_hash) DO NOTHING
  `;
}

async function isTokenHashValid(tokenHash: string): Promise<boolean> {
  await ensureSchema();
  const rows = await sql`
    SELECT 1 FROM platform_admin_sessions
    WHERE token_hash = ${tokenHash} AND expires_at > now()
    LIMIT 1
  `;
  return rows.length > 0;
}

async function revokeTokenHash(tokenHash: string) {
  await ensureSchema();
  await sql`DELETE FROM platform_admin_sessions WHERE token_hash = ${tokenHash}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function setPlatformAdminCookie(response: NextResponse, request: NextRequest) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
  await storeSessionToken(hashToken(token), expires);

  response.cookies.set({
    name: PLATFORM_ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'strict',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    expires,
  });
  return response;
}

export async function clearPlatformAdminCookie(response: NextResponse, request?: NextRequest) {
  const token = request?.cookies.get(PLATFORM_ADMIN_COOKIE)?.value;
  if (token) await revokeTokenHash(hashToken(token)).catch(() => {});

  response.cookies.set({
    name: PLATFORM_ADMIN_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    expires: new Date(0),
  });
  return response;
}

export async function isPlatformAdminRequest(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(PLATFORM_ADMIN_COOKIE)?.value;
  if (!token) return false;
  return isTokenHashValid(hashToken(token));
}

export async function isPlatformAdminSession(): Promise<boolean> {
  try {
    const token = cookies().get(PLATFORM_ADMIN_COOKIE)?.value;
    if (!token) return false;
    return isTokenHashValid(hashToken(token));
  } catch { return false; }
}
