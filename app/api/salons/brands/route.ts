import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { resolveAdminGate } from '@/lib/admin-auth';
import { ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const sessionId = cookies().get(ADMIN_COOKIE_NAME)?.value ?? null;
  const gate = await resolveAdminGate({
    slug: headers().get('x-salon-slug'),
    host: headers().get('host'),
    sessionId,
  });

  if (gate.kind !== 'authorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { brandIds } = await req.json();

  if (!Array.isArray(brandIds)) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  const sanitized = brandIds.map(String).filter(Boolean).slice(0, 50);

  await sql`
    UPDATE salons
    SET brand_domains = ${JSON.stringify(sanitized)}::jsonb
    WHERE slug = ${gate.salon.slug}
  `;

  return NextResponse.json({ ok: true });
}
