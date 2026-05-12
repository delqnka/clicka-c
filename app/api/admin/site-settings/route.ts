import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug } from '@/lib/admin-site';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site) {
    return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });
  }

  return NextResponse.json({ site });
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

  const next = {
    name: typeof body.name === 'string' ? body.name.trim() : current.name,
    category: typeof body.category === 'string' ? body.category.trim() : current.category,
    phone: typeof body.phone === 'string' ? body.phone.trim() : current.phone,
    city: typeof body.city === 'string' ? body.city.trim() : current.city,
    address: typeof body.address === 'string' ? body.address.trim() : current.address,
    about: typeof body.about === 'string' ? body.about.trim() : current.about,
    instagram: typeof body.instagram === 'string' ? body.instagram.trim() : current.instagram,
    facebook: typeof body.facebook === 'string' ? body.facebook.trim() : current.facebook,
    tiktok: typeof body.tiktok === 'string' ? body.tiktok.trim() : current.tiktok,
    googleMapsUrl:
      typeof body.googleMapsUrl === 'string' ? body.googleMapsUrl.trim() : current.googleMapsUrl,
    ownerName: typeof body.ownerName === 'string' ? body.ownerName.trim() : current.ownerName,
    ownerPublicRole:
      typeof body.ownerPublicRole === 'string'
        ? body.ownerPublicRole.trim()
        : current.ownerPublicRole,
    ownerPublicPhotoUrl:
      typeof body.ownerPublicPhotoUrl === 'string'
        ? body.ownerPublicPhotoUrl.trim()
        : current.ownerPublicPhotoUrl,
  };

  if (!next.name) {
    return NextResponse.json({ error: 'Името на салона е задължително.' }, { status: 400 });
  }

  await sql`
    UPDATE salons
    SET
      name = ${next.name},
      category = ${next.category || null},
      phone = ${next.phone || null},
      city = ${next.city || null},
      address = ${next.address || null},
      about = ${next.about || `${next.name} предлага онлайн резервации през собствен сайт.`},
      instagram_username = ${next.instagram || null},
      facebook_username = ${next.facebook || null},
      tiktok_username = ${next.tiktok || null},
      google_maps_url = ${next.googleMapsUrl || null},
      owner_name = ${next.ownerName || null},
      owner_public_role = ${next.ownerPublicRole || null},
      owner_public_photo_url = ${next.ownerPublicPhotoUrl || null},
      updated_at = now()
    WHERE slug = ${auth.salon.slug}
  `;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  return NextResponse.json({ success: true, site });
}
