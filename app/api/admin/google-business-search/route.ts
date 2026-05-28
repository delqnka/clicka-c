import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { searchGoogleBusinessesByName } from '@/lib/google-place-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const query = String(request.nextUrl.searchParams.get('q') ?? '').trim();
  if (!query) {
    return NextResponse.json({ results: [], reason: 'empty_query' });
  }

  const data = await searchGoogleBusinessesByName(query);
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
