import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import {
  normalizeLegalCustomDocuments,
  normalizeLegalInfoFromDb,
  type LegalInfoStored,
} from '@/lib/legal-custom-documents';

export type { LegalInfoStored as LegalInfoPayload } from '@/lib/legal-custom-documents';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const rows = await sql`SELECT legal_info FROM salons WHERE slug = ${auth.salon.slug} LIMIT 1`;
  const legalInfo = normalizeLegalInfoFromDb((rows[0] as Record<string, unknown>)?.legal_info);

  return NextResponse.json({ legalInfo });
}

export async function POST(request: NextRequest) {
  let body: { slug?: string } & Partial<LegalInfoStored> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const auth = await requireAdminRequestAccess(
    request,
    body.slug ?? request.nextUrl.searchParams.get('slug'),
  );
  if (!auth.ok) return auth.response;

  const rows = await sql`SELECT legal_info FROM salons WHERE slug = ${auth.salon.slug} LIMIT 1`;
  const current = normalizeLegalInfoFromDb((rows[0] as Record<string, unknown> | undefined)?.legal_info);

  const payload: LegalInfoStored = {
    companyName:
      typeof body.companyName === 'string' ? body.companyName.trim() : current.companyName,
    eik: typeof body.eik === 'string' ? body.eik.trim() : current.eik,
    managerName:
      typeof body.managerName === 'string' ? body.managerName.trim() : current.managerName,
    address: typeof body.address === 'string' ? body.address.trim() : current.address,
    contactEmail:
      typeof body.contactEmail === 'string' ? body.contactEmail.trim() : current.contactEmail,
    customDocuments:
      body.customDocuments && typeof body.customDocuments === 'object'
        ? normalizeLegalCustomDocuments(body.customDocuments)
        : current.customDocuments,
  };

  if (!payload.companyName) {
    return NextResponse.json(
      { error: 'Официалното наименование на фирмата е задължително.' },
      { status: 400 },
    );
  }

  await sql`
    UPDATE salons
    SET legal_info = ${JSON.stringify(payload)}::jsonb,
        updated_at = now()
    WHERE slug = ${auth.salon.slug}
  `;

  return NextResponse.json({ success: true, legalInfo: payload });
}
