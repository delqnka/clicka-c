import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import {
  loadAdminImageFieldsBySlug,
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

  const ownerPublicPhotoUrl =
    typeof body.ownerPublicPhotoUrl === 'string'
      ? body.ownerPublicPhotoUrl.trim()
      : current.ownerPublicPhotoUrl;
  const images =
    body.images !== undefined ? normalizeImageList(body.images) : current.images;

  await sql`
    UPDATE salons
    SET
      images = ${JSON.stringify(images)}::jsonb,
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
      images,
      ownerPublicPhotoUrl,
    },
  });
}
