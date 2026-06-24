import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import {
  getStaffMembers,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  ensureStaffPortalToken,
} from '@/lib/staff-members';
import { isSalonCustomDomainLive } from '@/lib/domain-routing';
import { sendStaffInviteEmail } from '@/lib/resend';
import { runAfterResponse } from '@/lib/run-after-response';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // Cyrillic transliteration (basic)
    .replace(/[а-я]/gi, (c) => {
      const map: Record<string, string> = {
        а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',
        к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',
        ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sht',ъ:'a',ь:'',ю:'yu',я:'ya',
      };
      return map[c.toLowerCase()] ?? c;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'staff';
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const salonId = auth.salon.salonId;
  const members = await getStaffMembers(salonId);
  return NextResponse.json({ staff: members });
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const salonId = auth.salon.salonId;

  let body: { name?: string; email?: string | null; serviceIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Името е задължително.' }, { status: 400 });
  }

  // Generate unique slug within this salon
  const baseSlug = slugify(body.name.trim());
  let candidateSlug = baseSlug;
  let attempt = 2;
  while (existing.some((m) => m.slug === candidateSlug)) {
    candidateSlug = `${baseSlug}${attempt}`;
    attempt++;
  }

  const member = await createStaffMember({
    salonId,
    name: body.name.trim(),
    slug: candidateSlug,
    email: body.email ?? null,
    serviceIds: body.serviceIds ?? [],
  });

  if (member.email && member.onboardingCode) {
    const memberEmail = member.email;
    const onboardingCode = member.onboardingCode;
    const customDomain = isSalonCustomDomainLive(auth.salon.domainStatus) && auth.salon.customDomain
      ? auth.salon.customDomain.trim().toLowerCase()
      : null;
    runAfterResponse(
      (customDomain
        ? ensureStaffPortalToken(member.id, salonId)
            .then((token) => `https://${customDomain}/staff-portal?token=${token}`)
            .catch((err) => {
              console.error('Failed to generate staff portal link:', err);
              return null;
            })
        : Promise.resolve<string | null>(null))
        .then((portalUrl) =>
          sendStaffInviteEmail(memberEmail, member.name, auth.salon.name, onboardingCode, portalUrl, salonId)
        )
        .catch((err) => {
          console.error('Failed to send staff invite email:', err);
        })
    );
  }

  return NextResponse.json({ staff: member }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const salonId = auth.salon.salonId;

  let body: { id?: string; name?: string; email?: string | null; bio?: string | null; isActive?: boolean; serviceIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id е задължително.' }, { status: 400 });
  }

  await updateStaffMember(body.id, salonId, {
    name: body.name,
    email: body.email,
    bio: body.bio,
    isActive: body.isActive,
    serviceIds: body.serviceIds,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const salonId = auth.salon.salonId;
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('id');

  if (!staffId) {
    return NextResponse.json({ error: 'id е задължително.' }, { status: 400 });
  }

  // Block deletion when future bookings exist for this staff member.
  const futureBookings = await sql`
    SELECT COUNT(*)::int AS count
    FROM bookings
    WHERE staff_member_id = ${staffId}::uuid
      AND date::date >= CURRENT_DATE
      AND lower(trim(coalesce(status, ''))) NOT IN ('cancelled', 'canceled', 'отказана', 'анулирана')
  `;
  const futureCount = Number((futureBookings[0] as { count: number }).count ?? 0);
  if (futureCount > 0) {
    return NextResponse.json(
      { error: `Служителят има ${futureCount} бъдещи резервации. Първо ги прехвърлете или отменете.`, futureCount },
      { status: 409 },
    );
  }

  await deleteStaffMember(staffId, salonId);
  return NextResponse.json({ ok: true });
}
