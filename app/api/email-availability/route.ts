import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { normalizeEmail } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit('email-availability', ip, 30, 60 * 1000);
  if (rl.limited) return NextResponse.json({ error: 'Твърде много опити. Изчакай малко.' }, { status: 429 });

  const emailNorm = normalizeEmail(new URL(request.url).searchParams.get('email') ?? '');
  if (!emailNorm) {
    return NextResponse.json({ exists: false });
  }

  const rows = await sql`SELECT id FROM site_owners WHERE email_norm = ${emailNorm} LIMIT 1`;
  return NextResponse.json({ exists: rows.length > 0 });
}
