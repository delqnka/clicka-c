import { NextRequest, NextResponse } from 'next/server';
import { POST as createBooking } from '@/app/api/public/bookings/route';

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

/**
 * POST /api/public/v1/salons/:slug/bookings
 *
 * Public booking creation for the SDK.
 *
 * Delegates to the secure public route and forces the path slug to win over
 * any body-provided slug.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const incoming = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!incoming) {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: PUBLIC_CORS },
    );
  }

  const url = new URL(request.url);
  url.pathname = '/api/public/bookings';

  const forwarded = new Request(url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ ...incoming, salonSlug: params.slug }),
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
