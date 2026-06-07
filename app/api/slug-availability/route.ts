import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit('slug-availability', ip, 30, 60 * 1000);
  if (rl.limited) return NextResponse.json({ error: 'Твърде много опити. Изчакай малко.' }, { status: 429 });

  const slug = (new URL(request.url).searchParams.get('slug') ?? '').trim().toLowerCase();
  if (!slug || !/^[a-z0-9]{1,32}$/.test(slug)) {
    return NextResponse.json({ available: false, reason: 'invalid' });
  }

  const rows = await sql`SELECT slug FROM salons WHERE slug = ${slug} LIMIT 1`;
  return NextResponse.json({ available: rows.length === 0 });
}
