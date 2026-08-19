import { NextRequest, NextResponse } from 'next/server';
import { GET as getBookings, OPTIONS } from '@/app/api/bookings/route';
import { verifyApiKey } from '@/lib/public-api-auth';

export { OPTIONS };

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
} as const;

type OccupiedEntry = { time: string; duration: number; quantity?: number; blocksAll?: boolean };
type PublicSlot = { start: string; end: string; available: boolean };

function toIsoSlot(date: string, time: string, durationMin: number): PublicSlot | null {
  // `date` is YYYY-MM-DD (Sofia local), `time` is HH:MM. We emit slots in
  // Sofia local time (no TZ suffix) so the SDK consumer can render the salon's
  // local hours regardless of where the caller runs.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}/.test(time)) return null;
  const [hh, mm] = time.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const startMin = hh * 60 + mm;
  const endMin = startMin + (durationMin > 0 ? durationMin : 60);
  const fmt = (totalMin: number) => {
    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    return `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  };
  return { start: fmt(startMin), end: fmt(endMin), available: false };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const sourceUrl = new URL(request.url);
  const date = sourceUrl.searchParams.get('date');
  const capacity = Math.max(1, Math.round(Number(sourceUrl.searchParams.get('capacity') ?? 1) || 1));

  if (!date) {
    return NextResponse.json({ error: 'Missing date' }, { status: 400, headers: PUBLIC_CORS });
  }

  const auth = await verifyApiKey(request, { slug: params.slug, requiredScope: 'read', corsHeaders: PUBLIC_CORS });
  if (!auth.ok) return auth.response;

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

  const upstream = await getBookings(forwarded);
  if (!upstream) {
    return NextResponse.json({ error: 'Bookings service unavailable' }, { status: 502, headers: PUBLIC_CORS });
  }
  if (!upstream.ok) {
    // Pass through error responses verbatim (status + body).
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { ...PUBLIC_CORS, 'Content-Type': 'application/json' },
    });
  }

  const occupied = dataOccupied((await upstream.json().catch(() => ({}))) as { occupied?: OccupiedEntry[] });
  const slots = occupied
    .filter((entry, index, entries) => {
      if (entry.blocksAll === true) return true;
      const overlaps = entries.filter((candidate) => candidate.time === entry.time && candidate.blocksAll !== true);
      const used = overlaps.reduce((sum, candidate) => sum + Math.max(1, Number(candidate.quantity ?? 1) || 1), 0);
      return used >= capacity && overlaps.findIndex((candidate) => candidate === entry) === index;
    })
    .map((entry) => toIsoSlot(date, entry.time, Number(entry.duration) || 0))
    .filter((s): s is PublicSlot => s !== null);

  return NextResponse.json({ slots, occupied, date }, { headers: PUBLIC_CORS });
}

function dataOccupied(data: { occupied?: OccupiedEntry[] }): OccupiedEntry[] {
  return Array.isArray(data.occupied) ? data.occupied : [];
}
