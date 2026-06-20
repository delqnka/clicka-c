import { NextRequest, NextResponse } from 'next/server';
import { POST as createBooking, OPTIONS } from '@/app/api/bookings/route';
import { verifyApiKey } from '@/lib/public-api-auth';

export { OPTIONS };

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
} as const;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: PUBLIC_CORS });
  }

  const slug = String(body.salonSlug ?? body.slug ?? '').trim();
  if (!slug) {
    return NextResponse.json({ error: 'Missing salonSlug' }, { status: 400, headers: PUBLIC_CORS });
  }

  const auth = await verifyApiKey(request, { slug, requiredScope: 'book', corsHeaders: PUBLIC_CORS });
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  url.pathname = '/api/bookings';
  url.searchParams.set('slug', slug);

  const forwarded = new Request(url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(body),
  }) as NextRequest;

  const upstream = await createBooking(forwarded);
  if (!upstream) {
    return NextResponse.json({ error: 'Booking service unavailable' }, { status: 502, headers: PUBLIC_CORS });
  }
  const upstreamBody = await upstream.json().catch(() => ({})) as Record<string, unknown>;

  if (!upstream.ok) {
    return NextResponse.json(upstreamBody, { status: upstream.status, headers: PUBLIC_CORS });
  }

  // Normalize to SDK shape: { bookingId, status, message }.
  // Engine returns `success: true` for direct bookings (no prepay) — those are
  // confirmed immediately. Prepay flows route through /booking-checkout
  // which doesn't emit a booking until webhook fires, so anything reaching
  // here is a confirmed reservation.
  return NextResponse.json(
    {
      bookingId: String(upstreamBody.bookingId ?? ''),
      status: 'confirmed' as const,
      message: typeof upstreamBody.message === 'string' ? upstreamBody.message : undefined,
    },
    { headers: PUBLIC_CORS },
  );
}
