import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import {
  buildGoogleCalendarConnectUrl,
  isGoogleCalendarConfigured,
} from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json(
      { error: 'Google Calendar интеграцията не е конфигурирана на сървъра.' },
      { status: 503 },
    );
  }

  const url = buildGoogleCalendarConnectUrl(auth.salon.salonId, auth.salon.slug);
  return NextResponse.redirect(url);
}
