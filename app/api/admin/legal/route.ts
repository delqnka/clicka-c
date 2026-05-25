import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';

export type LegalInfoPayload = {
  companyName: string;
  eik: string;
  managerName: string;
  address: string;
  contactEmail: string;
};

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const rows = await sql`SELECT legal_info FROM salons WHERE slug = ${auth.salon.slug} LIMIT 1`;
  const legalInfo = (rows[0] as Record<string, unknown>)?.legal_info ?? null;

  return NextResponse.json({ legalInfo });
}

export async function POST(request: NextRequest) {
  let body: { slug?: string } & Partial<LegalInfoPayload> = {};
  try { body = await request.json(); } catch {}

  const auth = await requireAdminRequestAccess(
    request,
    body.slug ?? request.nextUrl.searchParams.get('slug')
  );
  if (!auth.ok) return auth.response;

  const payload: LegalInfoPayload = {
    companyName: String(body.companyName ?? '').trim(),
    eik:         String(body.eik ?? '').trim(),
    managerName: String(body.managerName ?? '').trim(),
    address:     String(body.address ?? '').trim(),
    contactEmail: String(body.contactEmail ?? '').trim(),
  };

  await sql`
    UPDATE salons
    SET legal_info = ${JSON.stringify(payload)},
        updated_at = now()
    WHERE slug = ${auth.salon.slug}
  `;

  return NextResponse.json({ success: true, legalInfo: payload });
}
