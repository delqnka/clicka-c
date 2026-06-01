import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { deferRevalidateSalonPublicCache } from '@/lib/defer-revalidate-salon';
import { normalizeServices } from '@/lib/admin-site';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const rows = await sql`
    SELECT services FROM salons WHERE slug = ${auth.salon.slug} LIMIT 1
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });
  }

  const row = rows[0] as Record<string, unknown>;
  return NextResponse.json({ services: normalizeServices(row.services) });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: { services?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const services = normalizeServices(body.services);
  await sql`
    UPDATE salons
    SET
      services = ${JSON.stringify(services)}::jsonb,
      updated_at = now()
    WHERE slug = ${auth.salon.slug}
  `;

  deferRevalidateSalonPublicCache({
    slug: auth.salon.slug,
    customDomain: auth.salon.customDomain,
  });

  return NextResponse.json({ success: true, services });
}
