import { NextRequest, NextResponse } from 'next/server';
import { POST as createPackageCheckout } from '@/app/api/public/package-checkout/route';

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

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
  url.pathname = '/api/public/package-checkout';

  const forwarded = new Request(url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ ...incoming, salonSlug: params.slug }),
  }) as NextRequest;

  const upstream = await createPackageCheckout(forwarded);
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { ...PUBLIC_CORS, 'Content-Type': 'application/json' },
  });
}
