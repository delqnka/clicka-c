import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import {
  loadAdminImageFieldsBySlug,
  mergePortfolioImageSave,
  normalizeImageList,
} from '@/lib/admin-site';
import { deferRevalidateSalonPublicCache } from '@/lib/defer-revalidate-salon';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const images = await loadAdminImageFieldsBySlug(auth.salon.slug);
  if (!images) {
    return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });
  }

  return NextResponse.json(images);
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const current = await loadAdminImageFieldsBySlug(auth.salon.slug);
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
  const portfolioImagesRaw =
    body.portfolioImages !== undefined
      ? normalizeImageList(body.portfolioImages)
      : current.portfolioImages;
  const portfolioImages =
    body.portfolioImages !== undefined
      ? mergePortfolioImageSave(portfolioImagesRaw, current.portfolioImages, galleryImages)
      : current.portfolioImages;
  // If client sends '' it means "clear the cover" — do NOT silently replace with gallery[0].
  // The public site already falls back to gallery[0] if cover is empty.
  const normalizedCoverImageUrl = coverImageUrl || current.coverImageUrl || '';
  const normalizedLogoImageUrl =
    logoImageUrl || normalizedCoverImageUrl || galleryImages[0];

  await sql`
    UPDATE salons
    SET
      cover_image_url = ${normalizedCoverImageUrl},
      logo_image_url = ${normalizedLogoImageUrl},
      gallery_images = ${JSON.stringify(galleryImages)}::jsonb,
      portfolio_images = ${JSON.stringify(portfolioImages)}::jsonb,
      owner_public_photo_url = ${ownerPublicPhotoUrl || null},
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
      coverImageUrl: normalizedCoverImageUrl,
      logoImageUrl: normalizedLogoImageUrl,
      galleryImages,
      portfolioImages,
      ownerPublicPhotoUrl,
    },
  });
}
