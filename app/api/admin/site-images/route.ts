import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug, normalizeImageList } from '@/lib/admin-site';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site) {
    return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });
  }

  return NextResponse.json({
    coverImageUrl: site.coverImageUrl,
    logoImageUrl: site.logoImageUrl,
    galleryImages: site.galleryImages,
    ownerPublicPhotoUrl: site.ownerPublicPhotoUrl,
  });
}

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

  const coverImageUrl =
    typeof body.coverImageUrl === 'string' ? body.coverImageUrl.trim() : current.coverImageUrl;
  const logoImageUrl =
    typeof body.logoImageUrl === 'string' ? body.logoImageUrl.trim() : current.logoImageUrl;
  const ownerPublicPhotoUrl =
    typeof body.ownerPublicPhotoUrl === 'string'
      ? body.ownerPublicPhotoUrl.trim()
      : current.ownerPublicPhotoUrl;
  const galleryImages =
    body.galleryImages !== undefined ? normalizeImageList(body.galleryImages) : current.galleryImages;

  await sql`
    UPDATE salons
    SET
      cover_image_url = ${coverImageUrl || null},
      logo_image_url = ${logoImageUrl || coverImageUrl || galleryImages[0] || null},
      gallery_images = ${JSON.stringify(galleryImages)}::jsonb,
      owner_public_photo_url = ${ownerPublicPhotoUrl || null},
      updated_at = now()
    WHERE slug = ${auth.salon.slug}
  `;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  return NextResponse.json({ success: true, site });
}
