import { NextRequest, NextResponse } from 'next/server';
import { GET as getBookings, OPTIONS } from '@/app/api/bookings/route';

export { OPTIONS };

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const sourceUrl = new URL(request.url);
  const date = sourceUrl.searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Missing date' }, { status: 400 });
  }

  const url = new URL(request.url);
  url.pathname = '/api/bookings';
  url.searchParams.set('public', '1');
  url.searchParams.set('slug', params.slug);
  url.searchParams.set('date', date);

  const staffMemberId = sourceUrl.searchParams.get('staffMemberId');
  if (staffMemberId) url.searchParams.set('staffMemberId', staffMemberId);

  const forwarded = new Request(url, {
    method: 'GET',
    headers: request.headers,
  }) as NextRequest;

  return getBookings(forwarded);
}
