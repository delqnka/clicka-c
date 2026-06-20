import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { BRAND } from '@/lib/brand';
import {
  ensureCalendarFeedToken,
  loadSalonExternalIcsUrl,
  saveSalonExternalIcsUrl,
} from '@/lib/calendar-feed';

export const dynamic = 'force-dynamic';

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || BRAND.siteUrl).replace(/\/+$/, '');
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const [feedToken, externalIcsUrl] = await Promise.all([
    ensureCalendarFeedToken(auth.salon.salonId),
    loadSalonExternalIcsUrl(auth.salon.salonId),
  ]);

  const feedUrl = `${appBaseUrl()}/api/calendar/${feedToken}.ics`;
  const webcalUrl = feedUrl.replace(/^https?:/, 'webcal:');

  return NextResponse.json({
    feedUrl,
    webcalUrl,
    externalIcsUrl,
  });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: { externalIcsUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const externalIcsUrl =
    typeof body.externalIcsUrl === 'string' ? body.externalIcsUrl.trim().slice(0, 2048) : '';

  await saveSalonExternalIcsUrl(auth.salon.salonId, externalIcsUrl);

  return NextResponse.json({ success: true, externalIcsUrl });
}
