import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Called from the Stripe cancel redirect page to void an unpaid booking.
// Only cancels bookings where payment_status = 'pending' (awaiting Stripe).
export async function POST(request: NextRequest) {
  let body: { bookingId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const { bookingId } = body;
  if (!bookingId || typeof bookingId !== 'string') {
    return NextResponse.json({ error: 'Липсва bookingId' }, { status: 400 });
  }

  await sql`
    UPDATE bookings
    SET status = 'cancelled', payment_status = 'failed'
    WHERE id = ${bookingId}
      AND payment_status = 'pending'
  `.catch((err) => console.error('[cancel-payment]', err));

  return NextResponse.json({ ok: true });
}
