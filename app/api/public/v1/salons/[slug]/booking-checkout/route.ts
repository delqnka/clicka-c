import { NextRequest, NextResponse } from 'next/server';
import { POST as createCheckout } from '@/app/api/public/booking-checkout/route';

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

/**
 * POST /api/public/v1/salons/:slug/booking-checkout
 *
 * Delegates to the secure public checkout route, pinning salonSlug to the URL
 * path so the SDK consumer can't spoof it via the body.
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

  // Force the path-derived slug to win over anything in the body.
  const body = { ...incoming, salonSlug: params.slug };

  const url = new URL(request.url);
  url.pathname = '/api/public/booking-checkout';

  const forwarded = new Request(url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(body),
  }) as NextRequest;

  const upstream = await createCheckout(forwarded);
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { ...PUBLIC_CORS, 'Content-Type': 'application/json' },
  });
}
