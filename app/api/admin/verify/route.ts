import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sql } from '@/lib/db';

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

const COOKIE_NAME = 'clicka_admin_session';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const slug = request.nextUrl.searchParams.get('slug') ?? '';

  if (!token || !slug) {
    return NextResponse.redirect(new URL('/admin/sign-in', request.url));
  }

  const salons = await sql`
    SELECT id, slug
    FROM salons
    WHERE slug = ${slug} AND is_active = true
  `;
  if (salons.length === 0) {
    return NextResponse.redirect(new URL('/admin/sign-in', request.url));
  }
  const salon = salons[0] as any;

  const tokenHash = sha256(token);
  const tokens = await sql`
    SELECT id, expires_at, used_at
    FROM admin_login_tokens
    WHERE salon_id = ${salon.id} AND token_hash = ${tokenHash}
    LIMIT 1
  `;
  if (tokens.length === 0) {
    return NextResponse.redirect(new URL(`/admin/sign-in`, request.url));
  }

  const row = tokens[0] as any;
  const expiresAt = new Date(row.expires_at);
  if (row.used_at || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return NextResponse.redirect(new URL(`/admin/sign-in`, request.url));
  }

  // Mark token as used (best-effort single-use)
  await sql`
    UPDATE admin_login_tokens
    SET used_at = now()
    WHERE id = ${row.id}
  `;

  const sessionId = crypto.randomBytes(32).toString('hex');
  const sessionHash = sha256(sessionId);
  const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Requires DB table admin_sessions (see below).
  await sql`
    INSERT INTO admin_sessions (salon_id, session_hash, expires_at, created_at)
    VALUES (${salon.id}, ${sessionHash}, ${sessionExpires.toISOString()}, now())
  `;

  const res = NextResponse.redirect(new URL(`/${slug}/admin`, request.url));
  res.cookies.set({
    name: COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    expires: sessionExpires,
  });
  return res;
}

