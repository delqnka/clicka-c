import { NextResponse } from 'next/server';
import { getMarketingActivity } from '@/lib/marketing-activity';

export const dynamic = 'force-dynamic';

export async function GET() {
  const activity = await getMarketingActivity();

  return NextResponse.json(activity, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
