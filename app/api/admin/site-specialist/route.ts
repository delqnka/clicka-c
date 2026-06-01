import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { deferRevalidateSalonPublicCache } from '@/lib/defer-revalidate-salon';

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const ownerName = typeof body.ownerName === 'string' ? body.ownerName.trim() : '';
  const ownerPublicRole =
    typeof body.ownerPublicRole === 'string' ? body.ownerPublicRole.trim() : '';
  const ownerPublicPhotoUrl =
    typeof body.ownerPublicPhotoUrl === 'string' ? body.ownerPublicPhotoUrl.trim() : '';
  const ownerPublicBio =
    typeof body.ownerPublicBio === 'string' ? body.ownerPublicBio.trim() : '';

  await sql`
    UPDATE salons
    SET
      owner_name = ${ownerName || null},
      owner_public_role = ${ownerPublicRole || null},
      owner_public_photo_url = ${ownerPublicPhotoUrl || null},
      owner_public_bio = ${ownerPublicBio || null},
      updated_at = now()
    WHERE slug = ${auth.salon.slug}
  `;

  deferRevalidateSalonPublicCache({
    slug: auth.salon.slug,
    customDomain: auth.salon.customDomain,
  });

  return NextResponse.json({
    success: true,
    site: {
      ownerName,
      ownerPublicRole,
      ownerPublicPhotoUrl,
      ownerPublicBio,
    },
  });
}
