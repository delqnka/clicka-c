/**
 * Platform-admin endpoints for managing public_api_keys.
 *
 *   GET  /api/pa/api-keys?salonId=<id>  → list keys for a salon (metadata only)
 *   POST /api/pa/api-keys               → issue a new key (plaintext shown ONCE)
 *   DELETE /api/pa/api-keys?id=<keyId>  → revoke a key
 *
 * The plaintext key is never stored or retrievable after the POST response.
 */
import { NextRequest, NextResponse } from 'next/server';
import { isPlatformAdminRequest } from '@/lib/platform-admin-auth';
import { sql } from '@/lib/db';
import { generateApiKey } from '@/lib/public-api-auth';

type KeyRow = {
  id: string;
  salon_id: string;
  key_prefix: string;
  label: string | null;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export async function GET(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const salonId = new URL(request.url).searchParams.get('salonId')?.trim();
  if (!salonId) {
    return NextResponse.json({ error: 'Липсва salonId' }, { status: 400 });
  }

  const rows = (await sql`
    SELECT
      id::text          AS id,
      salon_id          AS salon_id,
      key_prefix        AS key_prefix,
      label             AS label,
      scopes            AS scopes,
      created_at        AS created_at,
      last_used_at      AS last_used_at,
      revoked_at        AS revoked_at
    FROM public_api_keys
    WHERE salon_id = ${salonId}
    ORDER BY created_at DESC
  `) as unknown as KeyRow[];

  return NextResponse.json({ keys: rows });
}

export async function POST(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    salonId?: string;
    label?: string;
    scopes?: string[];
  };

  const salonId = (body.salonId ?? '').trim();
  if (!salonId) {
    return NextResponse.json({ error: 'Липсва salonId' }, { status: 400 });
  }

  const salonExists = await sql`SELECT 1 FROM salons WHERE CAST(id AS text) = ${salonId} LIMIT 1`;
  if (salonExists.length === 0) {
    return NextResponse.json({ error: 'Салонът не съществува' }, { status: 404 });
  }

  const allowedScopes = new Set(['read', 'book']);
  const scopes = Array.isArray(body.scopes)
    ? body.scopes.filter((s) => allowedScopes.has(s))
    : ['read', 'book'];
  if (scopes.length === 0) {
    return NextResponse.json({ error: 'Невалидни scopes' }, { status: 400 });
  }

  const label = (body.label ?? '').trim().slice(0, 80) || null;

  const { plaintext, hash, prefix } = generateApiKey();

  const inserted = (await sql`
    INSERT INTO public_api_keys (salon_id, key_prefix, key_hash, label, scopes)
    VALUES (${salonId}, ${prefix}, ${hash}, ${label}, ${scopes}::text[])
    RETURNING id::text AS id, created_at
  `) as unknown as { id: string; created_at: string }[];

  return NextResponse.json({
    id: inserted[0]?.id,
    plaintext,             // ← shown ONCE; UI must surface and instruct the operator to copy
    prefix,
    label,
    scopes,
    createdAt: inserted[0]?.created_at,
  });
}

export async function DELETE(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const keyId = new URL(request.url).searchParams.get('id')?.trim();
  if (!keyId) {
    return NextResponse.json({ error: 'Липсва id' }, { status: 400 });
  }

  await sql`
    UPDATE public_api_keys
    SET revoked_at = now()
    WHERE id::text = ${keyId} AND revoked_at IS NULL
  `;

  return NextResponse.json({ ok: true });
}
