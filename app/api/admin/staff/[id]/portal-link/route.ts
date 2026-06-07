import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { getPlatformPublicUrl } from '@/lib/domain-routing';
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

  const salonId = auth.salon.salonId;
  const member = await getStaffMemberById(params.id);
  if (!member || member.salonId !== salonId) {
    return NextResponse.json({ error: 'Служителят не е намерен' }, { status: 404 });
  }

  const regenerate = request.nextUrl.searchParams.get('regenerate') === '1';
  const token = regenerate
    ? await regenerateStaffPortalToken(member.id, salonId)
    : await ensureStaffPortalToken(member.id, salonId);

  const url = `${getPlatformPublicUrl(auth.salon.slug)}/staff-portal?token=${token}`;
  return NextResponse.json({ url });
}
