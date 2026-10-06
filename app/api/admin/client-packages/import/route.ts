import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { importMembershipCsv, parseMembershipCsv, type MembershipImportMode } from '@/lib/client-package-import';

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: { csvText?: string; mode?: MembershipImportMode };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const csvText = String(body.csvText ?? '').trim();
  const mode: MembershipImportMode = body.mode === 'import' ? 'import' : 'preview';
  if (!csvText) {
    return NextResponse.json({ error: 'Поставете CSV/таблични данни за import.' }, { status: 400 });
  }

  const result = mode === 'import'
    ? await importMembershipCsv({ salonId: auth.salon.salonId, csvText })
    : parseMembershipCsv(csvText);

  if (mode === 'import' && !result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json(result);
}
