import { NextRequest, NextResponse } from 'next/server';
import { GET as getStaff } from '@/app/api/staff/route';

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const url = new URL(request.url);
  url.pathname = '/api/staff';
  url.searchParams.set('slug', params.slug);

  const forwarded = new Request(url, {
    method: 'GET',
    headers: request.headers,
  }) as NextRequest;

  const upstream = await getStaff(forwarded);
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { ...PUBLIC_CORS, 'Content-Type': 'application/json' },
  });
}
