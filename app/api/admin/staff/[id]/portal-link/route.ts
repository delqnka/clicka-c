import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { isSalonCustomDomainUsable } from '@/lib/domain-routing';
import {
  ensureStaffPortalToken,
  getStaffMemberById,
  regenerateStaffPortalToken,
} from '@/lib/staff-members';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const customDomain = isSalonCustomDomainUsable({
    customDomain: auth.salon.customDomain,
    domainStatus: auth.salon.domainStatus,
  })
    ? (auth.salon.customDomain ?? '').trim().toLowerCase()
    : null;
  if (!customDomain) {
    return NextResponse.json(
      { error: 'Линк за служител може да се създаде само след като custom домейнът на салона е активен.' },
      { status: 409 },
    );
  }

  const salonId = auth.salon.salonId;
  const member = await getStaffMemberById(params.id);
  if (!member || member.salonId !== salonId) {
    return NextResponse.json({ error: 'Служителят не е намерен' }, { status: 404 });
  }

  const regenerate = request.nextUrl.searchParams.get('regenerate') === '1';
  const token = regenerate
    ? await regenerateStaffPortalToken(member.id, salonId)
    : await ensureStaffPortalToken(member.id, salonId);

  const url = `https://${customDomain}/staff-portal?token=${token}`;
  return NextResponse.json({ url });
}
