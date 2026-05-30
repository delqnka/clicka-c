import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { revalidateSalonPublicCache } from '@/lib/revalidate-salon-public';

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  await sql`
    UPDATE salons
    SET is_active = true, site_status = 'active', updated_at = now()
    WHERE slug = ${auth.salon.slug}
  `;

  revalidateSalonPublicCache({
    slug: auth.salon.slug,
    customDomain: auth.salon.customDomain,
  });

  return NextResponse.json({ success: true });
}
