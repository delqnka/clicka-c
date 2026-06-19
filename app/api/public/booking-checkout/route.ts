import { NextRequest, NextResponse } from 'next/server';
import { POST as createCheckout } from '@/app/api/stripe/booking-checkout/route';

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: PUBLIC_CORS });
  }

  const forwarded = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(body),
  }) as NextRequest;

  const response = await createCheckout(forwarded);
  const headers = new Headers(response.headers);
  Object.entries(PUBLIC_CORS).forEach(([key, value]) => headers.set(key, value));

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
