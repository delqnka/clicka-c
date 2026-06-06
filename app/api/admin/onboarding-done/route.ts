import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const auth = await requireAdminRequestAccess(request);
  if (!auth || auth.kind !== 'authorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await sql`
    ALTER TABLE salons ADD COLUMN IF NOT EXISTS onboarding_tour_done boolean DEFAULT false
  `;

  await sql`
    UPDATE salons SET onboarding_tour_done = true WHERE slug = ${auth.salon.slug}
  `;

  return NextResponse.json({ ok: true });
}
