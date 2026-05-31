import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { loadExternalCalendarEventsForRange } from '@/lib/calendar-external-events';

export const dynamic = 'force-dynamic';

function monthBounds(year: number, monthIndex: number) {
  const from = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const to = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const from = request.nextUrl.searchParams.get('from')?.trim();
  const to = request.nextUrl.searchParams.get('to')?.trim();
  const date = request.nextUrl.searchParams.get('date')?.trim();

  let fromYmd = from ?? '';
  let toYmd = to ?? '';

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    fromYmd = date;
    toYmd = date;
  }

  if (!fromYmd || !toYmd) {
    const now = new Date();
    const bounds = monthBounds(now.getFullYear(), now.getMonth());
    fromYmd = bounds.from;
    toYmd = bounds.to;
  }

  const events = await loadExternalCalendarEventsForRange(auth.salon.salonId, fromYmd, toYmd);
  const markedDates = [...new Set(events.map((ev) => ev.date))];

  return NextResponse.json({ events, markedDates, from: fromYmd, to: toYmd });
}
