import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { createConnectedAccount, createAccountLink } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { slug?: string };
  const slug = body.slug ?? null;

  const access = await requireAdminRequestAccess(request, slug);
  if (!access.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { salonId, salonSlug, salonName } = access.session;

  // Load existing stripe_account_id
  const rows = await sql`
    SELECT stripe_account_id FROM salons WHERE id = ${salonId} LIMIT 1
  `;
  const row = rows[0] as { stripe_account_id: string | null } | undefined;
  let accountId = row?.stripe_account_id ?? null;

  // Create connected account if first time
  if (!accountId) {
    accountId = await createConnectedAccount(access.session.ownerEmail, salonName);
    await sql`
      UPDATE salons
      SET stripe_account_id = ${accountId}
      WHERE id = ${salonId}
    `;
  }

  // Build return URL from the actual host of the request (custom domain or subdomain)
  const host = request.headers.get('host') ?? '';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const adminBase = `${proto}://${host}/admin?tab=payments`;

  const onboardingUrl = await createAccountLink(accountId, adminBase);
  return NextResponse.json({ url: onboardingUrl });
}
