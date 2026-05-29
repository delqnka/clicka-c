import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug } from '@/lib/admin-site';

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const current = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!current) {
    return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const ownerName =
    typeof body.ownerName === 'string' ? body.ownerName.trim() : current.ownerName;
  const ownerPublicRole =
    typeof body.ownerPublicRole === 'string'
      ? body.ownerPublicRole.trim()
      : current.ownerPublicRole;
  const ownerPublicPhotoUrl =
    typeof body.ownerPublicPhotoUrl === 'string'
      ? body.ownerPublicPhotoUrl.trim()
      : current.ownerPublicPhotoUrl;
  const ownerPublicBio =
    typeof body.ownerPublicBio === 'string'
      ? body.ownerPublicBio.trim()
      : current.ownerPublicBio;

  await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_public_bio text`;
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

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  return NextResponse.json({ success: true, site });
}
