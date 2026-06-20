import { NextRequest, NextResponse } from 'next/server';
import { GET as getStaff, OPTIONS } from '@/app/api/staff/route';
import { verifyApiKey } from '@/lib/public-api-auth';

export { OPTIONS };

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const auth = await verifyApiKey(request, { slug: params.slug, requiredScope: 'read', corsHeaders: PUBLIC_CORS });
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  url.pathname = '/api/staff';
  url.searchParams.set('slug', params.slug);

  const forwarded = new Request(url, {
    method: 'GET',
    headers: request.headers,
  }) as NextRequest;

  return getStaff(forwarded);
}
