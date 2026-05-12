import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug, normalizeWorkingHours } from '@/lib/admin-site';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site) {
    return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });
  }

  return NextResponse.json({ workingHours: site.workingHours });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: { workingHours?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const workingHours = normalizeWorkingHours(body.workingHours);

  await sql`
    UPDATE salons
    SET
      working_hours = ${JSON.stringify(workingHours)}::jsonb,
      updated_at = now()
    WHERE slug = ${auth.salon.slug}
  `;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  return NextResponse.json({ success: true, workingHours: site?.workingHours });
}
