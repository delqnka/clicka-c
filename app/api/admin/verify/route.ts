import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  createOwnerSession,
  ensureAdminAuthSchema,
  ensureOwnerForSalon,
  getPrimaryOwnerForSalon,
  setAdminSessionCookie,
  sha256,
} from '@/lib/admin-auth';
import { getHostAwareSalonPath } from '@/lib/domain-routing';

export async function GET(request: NextRequest) {
  await ensureAdminAuthSchema();

  const token = request.nextUrl.searchParams.get('token') ?? '';
  // Accept slug from query param or from middleware header (subdomain access)
  const slug =
    request.nextUrl.searchParams.get('slug') ||
    request.headers.get('x-salon-slug') ||
    '';

  if (!token || !slug) {
    return NextResponse.redirect(new URL('/admin/sign-in', request.url));
  }

  const salons = await sql`
    SELECT CAST(id AS text) AS salon_id, slug, email
    FROM salons
    WHERE slug = ${slug} AND is_active = true
  `;
  if (salons.length === 0) {
    return NextResponse.redirect(new URL('/admin/sign-in', request.url));
  }
  const salon = salons[0] as Record<string, unknown>;

  const tokenHash = sha256(token);
  const tokens = await sql`
    SELECT id, expires_at, used_at
    FROM admin_login_tokens
    WHERE salon_id = ${String(salon.salon_id ?? '')} AND token_hash = ${tokenHash}
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

  const existingOwner = await getPrimaryOwnerForSalon(String(salon.salon_id ?? ''));
  const owner =
    existingOwner ??
    (await ensureOwnerForSalon({
      salonId: String(salon.salon_id ?? ''),
      email: String(salon.email ?? ''),
    }));
  const { sessionId, sessionExpires } = await createOwnerSession({
    salonId: String(salon.salon_id ?? ''),
    ownerId: owner.ownerId,
  });

  const redirectPath = getHostAwareSalonPath({
    host: request.headers.get('host'),
    slug,
    path: 'admin',
  });
  const res = NextResponse.redirect(new URL(redirectPath, request.url));
  setAdminSessionCookie(res, request, sessionId, sessionExpires);
  return res;
}

