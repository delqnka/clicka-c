import { NextRequest, NextResponse } from 'next/server';
import { isPlatformAdminRequest } from '@/lib/platform-admin-auth';
import { stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ payments: [], totalRevenue: 0 });
  }

  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      expand: ['data.line_items'],
    });

    const payments = sessions.data
      .filter((s) => s.payment_status === 'paid')
      .map((s) => ({
        id: s.id,
        amount: s.amount_total ?? 0,
        currency: s.currency ?? 'eur',
        customerEmail: s.customer_details?.email ?? null,
        created: s.created,
        flow: s.metadata?.flow ?? 'booking',
        salonSlug: s.metadata?.salonSlug ?? null,
      }));

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({ payments, totalRevenue });
  } catch {
    return NextResponse.json({ payments: [], totalRevenue: 0 });
  }
}
