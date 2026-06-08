import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { ensureAdminSiteSchema } from '@/lib/ensure-admin-site-schema';

export async function POST(request: NextRequest) {
  const auth = await requireAdminRequestAccess(request);
  if (!auth || !auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureAdminSiteSchema();

  await sql`
    UPDATE salons SET onboarding_tour_done = true WHERE slug = ${auth.salon.slug}
  `;

  return NextResponse.json({ ok: true });
}
