import { NextRequest, NextResponse } from 'next/server';
import { GET as getStaff, OPTIONS } from '@/app/api/staff/route';

export { OPTIONS };

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

  return getStaff(forwarded);
}
