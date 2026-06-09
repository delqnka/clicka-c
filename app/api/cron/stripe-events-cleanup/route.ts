import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await sql`
    DELETE FROM stripe_processed_events
    WHERE created_at < now() - INTERVAL '180 days'
  `;
  const deleted = (result as unknown as { count?: number }).count ?? 0;
  console.log(`[stripe-events-cleanup] Deleted ${deleted} old events`);
  return NextResponse.json({ deleted });
}
