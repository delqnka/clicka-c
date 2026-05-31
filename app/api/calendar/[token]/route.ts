import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { buildSalonCalendarFeed } from '@/lib/calendar-ics';
import { resolveSalonByFeedToken } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } },
) {
  const token = String(params.token ?? '').replace(/\.ics$/i, '').trim();
  if (!token || token.length < 16) {
    return new NextResponse('Not found', { status: 404 });
  }

  const salon = await resolveSalonByFeedToken(token);
  if (!salon) {
    return new NextResponse('Not found', { status: 404 });
  }

  const rows = await sql`
    SELECT
      id, client_name, client_phone, client_email,
      service_name, service_duration, date, time, status, notes
    FROM bookings
    WHERE salon_id = ${salon.salonId}
      AND status IN ('pending', 'confirmed')
    ORDER BY date ASC, time ASC
    LIMIT 500
  `;

  const ics = buildSalonCalendarFeed(
    salon.salonName,
    rows.map((raw) => {
      const row = raw as Record<string, unknown>;
      return {
        id: String(row.id),
        client_name: String(row.client_name ?? ''),
        client_phone: row.client_phone ? String(row.client_phone) : null,
        client_email: row.client_email ? String(row.client_email) : null,
        service_name: String(row.service_name ?? ''),
        service_duration: row.service_duration != null ? Number(row.service_duration) : null,
        date: String(row.date ?? ''),
        time: String(row.time ?? ''),
        status: String(row.status ?? ''),
        notes: row.notes ? String(row.notes) : null,
      };
    }),
  );

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${salon.salonName.replace(/[^\w\-]+/g, '-')}-bookings.ics"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
