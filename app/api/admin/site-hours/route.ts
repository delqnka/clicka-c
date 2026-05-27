import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug, normalizeWorkingHours } from '@/lib/admin-site';
import { normalizeBookingBlocks } from '@/lib/booking-blocks';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site) {
    return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });
  }

  return NextResponse.json({ workingHours: site.workingHours, bookingBlocks: site.bookingBlocks });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: { workingHours?: unknown; bookingBlocks?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const workingHours = normalizeWorkingHours(body.workingHours);
  const bookingBlocks = normalizeBookingBlocks(body.bookingBlocks);
  const currentRows = await sql`
    SELECT opening_hours
    FROM salons
    WHERE slug = ${auth.salon.slug}
    LIMIT 1
  `;
  const currentOpeningHours =
    currentRows[0]?.opening_hours && typeof currentRows[0].opening_hours === 'object'
      ? (currentRows[0].opening_hours as Record<string, unknown>)
      : {};
  const nextOpeningHours = { ...currentOpeningHours, booking_blocks: bookingBlocks };

  await sql`
    UPDATE salons
    SET
      working_hours = ${JSON.stringify(workingHours)}::jsonb,
      opening_hours = ${JSON.stringify(nextOpeningHours)}::jsonb,
      updated_at = now()
    WHERE slug = ${auth.salon.slug}
  `;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  return NextResponse.json({
    success: true,
    workingHours: site?.workingHours,
    bookingBlocks: site?.bookingBlocks ?? [],
  });
}
