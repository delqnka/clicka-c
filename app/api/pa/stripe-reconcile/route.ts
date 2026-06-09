import { NextRequest, NextResponse } from 'next/server';
import { isPlatformAdminRequest } from '@/lib/platform-admin-auth';
import { stripe } from '@/lib/stripe';
import { sql } from '@/lib/db';

export interface ReconcileIssue {
  sessionId: string;
  flow: string;
  amountTotal: number;
  currency: string;
  createdAt: number;
  reason: string;
}

export async function GET(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 3600;

  // Fetch last 100 paid sessions from the main Stripe account
  // (booking deposits use Stripe Connect — separate account, not checked here)
  const page = await stripe.checkout.sessions.list({
    limit: 100,
    created: { gte: thirtyDaysAgo },
  });

  const paid = page.data.filter((s) => s.payment_status === 'paid');

  const smsSessions   = paid.filter((s) => s.metadata?.flow === 'sms_pack');
  const domainSessions = paid.filter((s) => s.metadata?.flow === 'domain_purchase_request');
  const subSessions   = paid.filter((s) => !s.metadata?.flow && !!s.metadata?.salonSlug);

  // Batch-check each group against the DB
  const [smsFound, domainFound, subFound] = await Promise.all([
    smsSessions.length > 0
      ? sql`
          SELECT stripe_session_id
          FROM sms_transactions
          WHERE stripe_session_id = ANY(${smsSessions.map((s) => s.id)})
        `.then((rows) => new Set(rows.map((r) => (r as { stripe_session_id: string }).stripe_session_id)))
      : Promise.resolve(new Set<string>()),

    domainSessions.length > 0
      ? sql`
          SELECT stripe_session_id
          FROM domain_purchase_requests
          WHERE stripe_session_id = ANY(${domainSessions.map((s) => s.id)})
        `.then((rows) => new Set(rows.map((r) => (r as { stripe_session_id: string }).stripe_session_id)))
      : Promise.resolve(new Set<string>()),

    subSessions.length > 0
      ? sql`
          SELECT stripe_session_id
          FROM salons
          WHERE stripe_session_id = ANY(${subSessions.map((s) => s.id)})
        `.then((rows) => new Set(rows.map((r) => (r as { stripe_session_id: string }).stripe_session_id)))
      : Promise.resolve(new Set<string>()),
  ]);

  const issues: ReconcileIssue[] = [];

  for (const s of smsSessions) {
    if (!smsFound.has(s.id)) {
      issues.push({
        sessionId: s.id,
        flow: 'sms_pack',
        amountTotal: s.amount_total ?? 0,
        currency: s.currency ?? 'eur',
        createdAt: s.created,
        reason: 'Липсва SMS транзакция в БД',
      });
    }
  }

  for (const s of domainSessions) {
    if (!domainFound.has(s.id)) {
      issues.push({
        sessionId: s.id,
        flow: 'domain_purchase_request',
        amountTotal: s.amount_total ?? 0,
        currency: s.currency ?? 'eur',
        createdAt: s.created,
        reason: 'Липсва домейн заявка в БД',
      });
    }
  }

  for (const s of subSessions) {
    if (!subFound.has(s.id)) {
      issues.push({
        sessionId: s.id,
        flow: `plan (${s.metadata?.salonSlug ?? '?'})`,
        amountTotal: s.amount_total ?? 0,
        currency: s.currency ?? 'eur',
        createdAt: s.created,
        reason: 'Липсва активен план в БД',
      });
    }
  }

  // ── DB-level plan consistency checks ────────────────────────────────────────

  const [expiredButActive, paidButInactive, activeNoPlan] = await Promise.all([
    // Active salons whose plan has expired
    sql`
      SELECT CAST(id AS text) AS salon_id, slug, plan_expires_at
      FROM salons
      WHERE is_active = true
        AND plan_expires_at IS NOT NULL
        AND plan_expires_at < now()
    ` as unknown as Promise<{ salon_id: string; slug: string; plan_expires_at: string }[]>,

    // Salons that paid (have stripe_session_id) but are still inactive
    sql`
      SELECT CAST(id AS text) AS salon_id, slug, stripe_session_id, plan_expires_at
      FROM salons
      WHERE is_active = false
        AND stripe_session_id IS NOT NULL
        AND stripe_session_id <> ''
        AND (plan_expires_at IS NULL OR plan_expires_at > now())
    ` as unknown as Promise<{ salon_id: string; slug: string; stripe_session_id: string; plan_expires_at: string | null }[]>,

    // Active salons with no payment record at all
    sql`
      SELECT CAST(id AS text) AS salon_id, slug, created_at
      FROM salons
      WHERE is_active = true
        AND (stripe_customer_id IS NULL OR stripe_customer_id = '')
        AND (stripe_session_id IS NULL OR stripe_session_id = '')
    ` as unknown as Promise<{ salon_id: string; slug: string; created_at: string }[]>,
  ]);

  return NextResponse.json({
    ok: issues.length === 0 && expiredButActive.length === 0 && paidButInactive.length === 0,
    stripe: {
      checked: paid.length,
      total: page.data.length,
      issues,
    },
    db: {
      expired_but_active: expiredButActive,
      paid_but_inactive: paidButInactive,
      active_no_payment: activeNoPlan,
    },
  });
}
