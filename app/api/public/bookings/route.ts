import { NextRequest, NextResponse } from 'next/server';
import { POST as createBooking, OPTIONS } from '@/app/api/bookings/route';

export { OPTIONS };

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const slug = String(body.salonSlug ?? body.slug ?? '').trim();
  if (!slug) {
    return NextResponse.json({ error: 'Missing salonSlug' }, { status: 400 });
  }

  const url = new URL(request.url);
  url.pathname = '/api/bookings';
  url.searchParams.set('slug', slug);

  const forwarded = new Request(url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(body),
  }) as NextRequest;

  return createBooking(forwarded);
}
