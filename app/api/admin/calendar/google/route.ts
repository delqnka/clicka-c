import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { clearGoogleCalendarConnection, loadGoogleCalendarConnection } from '@/lib/google-calendar';
import { syncAllBookingsToGoogleCalendar } from '@/lib/calendar-sync';
import { runAfterResponse } from '@/lib/run-after-response';

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  await clearGoogleCalendarConnection(auth.salon.salonId);
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const connection = await loadGoogleCalendarConnection(auth.salon.salonId);
  if (!connection) {
    return NextResponse.json({ error: 'Google Calendar не е свързан.' }, { status: 400 });
  }

  runAfterResponse(
    syncAllBookingsToGoogleCalendar(auth.salon.salonId, auth.salon.name).catch((err) =>
      console.error('[calendar resync]', err),
    ),
  );

  return NextResponse.json({ success: true, message: 'Синхронизацията започна.' });
}
