import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await sql`
    SELECT
      COALESCE(
        COUNT(*) FILTER (
          WHERE is_active = true
            AND created_at >= date_trunc('month', now())
        ),
        0
      )::int AS started_this_month,
      COALESCE(
        COUNT(*) FILTER (
          WHERE site_status = 'pending'
        ),
        0
      )::int AS setting_up_now
    FROM salons
  `;

  const row = (rows[0] ?? {}) as Record<string, unknown>;

  return NextResponse.json(
    {
      startedThisMonth: Number(row.started_this_month ?? 0),
      settingUpNow: Number(row.setting_up_now ?? 0),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}
