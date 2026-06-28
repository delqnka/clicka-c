import { NextRequest, NextResponse } from 'next/server';
import { GET as getSlots } from '@/app/api/public/salons/[slug]/slots/route';

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

/**
 * GET /api/public/v1/salons/:slug/slots?date=YYYY-MM-DD&staffMemberId=…
 *
 * Wraps the secure slots route and keeps the legacy SDK response shape.
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

  const upstream = await getSlots(request, { params });
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
