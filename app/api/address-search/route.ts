import { NextRequest, NextResponse } from 'next/server';
import { searchOsmAddresses } from '@/lib/address-search-osm';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** Прокси към Nominatim (OpenStreetMap) — без Google API ключ. */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit('address-search', ip, 30, 60 * 1000);
  if (rl.limited) return NextResponse.json([], { status: 429 });

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const city = request.nextUrl.searchParams.get('city')?.trim() ?? '';
  if (q.length < 3) {
    return NextResponse.json([]);
  }

  try {
    const data = await searchOsmAddresses(q, city);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json([], { status: 502 });
  }
}
