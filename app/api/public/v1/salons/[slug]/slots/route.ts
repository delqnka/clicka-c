import { NextRequest, NextResponse } from 'next/server';
import { GET as getBookings } from '@/app/api/bookings/route';

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

/**
 * GET /api/public/v1/salons/:slug/slots?date=YYYY-MM-DD&staffMemberId=…
 *
 * Returns the same `{ occupied: [{ time, duration }] }` shape the BookingWidget
 * already consumes. Anonymous, CORS-open, no API key required.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const sourceUrl = new URL(request.url);
  const date = sourceUrl.searchParams.get('date');
  if (!date) {
    return NextResponse.json(
      { error: 'Missing date' },
      { status: 400, headers: PUBLIC_CORS },
    );
  }

  const url = new URL(request.url);
  url.pathname = '/api/bookings';
  url.searchParams.set('public', '1');
  url.searchParams.set('slug', params.slug);
  url.searchParams.set('date', date);
  const staffMemberId = sourceUrl.searchParams.get('staffMemberId');
  if (staffMemberId) url.searchParams.set('staffMemberId', staffMemberId);

  const forwarded = new Request(url, {
    method: 'GET',
    headers: request.headers,
  }) as NextRequest;

  const upstream = await getBookings(forwarded);
  if (!upstream) {
    return NextResponse.json(
      { error: 'Slots service unavailable' },
      { status: 502, headers: PUBLIC_CORS },
    );
  }
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { ...PUBLIC_CORS, 'Content-Type': 'application/json' },
  });
}
