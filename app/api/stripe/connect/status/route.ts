import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { getConnectedAccountStatus } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  const access = await requireAdminRequestAccess(request, slug);
  if (!access.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { salonId } = access.session;

  const rows = await sql`
    SELECT stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted
    FROM salons WHERE id = ${salonId} LIMIT 1
  `;
  const row = rows[0] as {
    stripe_account_id: string | null;
    stripe_charges_enabled: boolean;
    stripe_payouts_enabled: boolean;
    stripe_details_submitted: boolean;
  } | undefined;

  if (!row?.stripe_account_id) {
    return NextResponse.json({ connected: false });
  }

  // Always sync live status from Stripe
  try {
    const status = await getConnectedAccountStatus(row.stripe_account_id);
    await sql`
      UPDATE salons SET
        stripe_charges_enabled   = ${status.chargesEnabled},
        stripe_payouts_enabled   = ${status.payoutsEnabled},
        stripe_details_submitted = ${status.detailsSubmitted},
        stripe_onboarding_complete = ${status.chargesEnabled && status.detailsSubmitted}
      WHERE id = ${salonId}
    `;
    return NextResponse.json({
      connected: true,
      accountId: row.stripe_account_id,
      chargesEnabled:   status.chargesEnabled,
      payoutsEnabled:   status.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
    });
  } catch {
    // Return cached DB values if Stripe call fails
    return NextResponse.json({
      connected: true,
      accountId: row.stripe_account_id,
      chargesEnabled:   row.stripe_charges_enabled,
      payoutsEnabled:   row.stripe_payouts_enabled,
      detailsSubmitted: row.stripe_details_submitted,
    });
  }
}
