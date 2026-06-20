import { NextRequest, NextResponse } from 'next/server';
import { POST as createBooking } from '@/app/api/bookings/route';

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

/**
 * POST /api/public/v1/salons/:slug/bookings
 *
 * Public anonymous booking creation. Body shape unchanged from internal
 * POST /api/bookings — slug is taken from the URL path.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const rawBody = await request.text();

  const url = new URL(request.url);
  url.pathname = '/api/bookings';
  url.searchParams.set('slug', params.slug);

  const forwarded = new Request(url, {
    method: 'POST',
    headers: request.headers,
    body: rawBody,
  }) as NextRequest;

  const upstream = await createBooking(forwarded);
  if (!upstream) {
    return NextResponse.json(
      { error: 'Bookings service unavailable' },
      { status: 502, headers: PUBLIC_CORS },
    );
  }
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { ...PUBLIC_CORS, 'Content-Type': 'application/json' },
  });
}
