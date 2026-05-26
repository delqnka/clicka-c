import { NextRequest, NextResponse } from 'next/server';
import { searchOsmAddresses } from '@/lib/address-search-osm';

export const dynamic = 'force-dynamic';

/** Прокси към Nominatim (OpenStreetMap) — без Google API ключ. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 3) {
    return NextResponse.json([]);
  }

  try {
    const data = await searchOsmAddresses(q);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json([], { status: 502 });
  }
}
