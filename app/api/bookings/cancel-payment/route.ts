import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendBookingCancellationEmails } from '@/lib/booking-cancellation-notifications';
import { runAfterResponse } from '@/lib/run-after-response';

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

  const rows = await sql`
    UPDATE bookings b
    SET status = 'cancelled', payment_status = 'failed'
    FROM salons s
    WHERE b.id = ${bookingId}
      AND b.payment_status = 'pending'
      AND CAST(s.id AS text) = b.salon_id
    RETURNING
      b.salon_id,
      b.staff_member_id,
      b.client_name,
      b.client_phone,
      b.client_email,
      b.service_name,
      b.date,
      b.time,
      s.name AS salon_name,
      s.email AS salon_email,
      s.owner_name AS salon_owner_name,
      s.language
  `.catch((err) => {
    console.error('[cancel-payment]', err);
    return [];
  }) as Array<{
    salon_id: string;
    staff_member_id: string | null;
    client_name: string;
    client_phone: string | null;
    client_email: string | null;
    service_name: string;
    date: string;
    time: string;
    salon_name: string;
    salon_email: string | null;
    salon_owner_name: string | null;
    language: string | null;
  }>;

  const booking = rows[0];
  if (booking) {
    runAfterResponse(
      sendBookingCancellationEmails({
        salonId: booking.salon_id,
        salonName: booking.salon_name,
        salonEmail: booking.salon_email,
        salonOwnerName: booking.salon_owner_name ?? undefined,
        staffMemberId: booking.staff_member_id,
        clientName: booking.client_name,
        clientPhone: booking.client_phone,
        clientEmail: booking.client_email ?? undefined,
        serviceName: booking.service_name,
        date: booking.date,
        time: booking.time,
        language: booking.language,
      }).catch((err) => console.error('[cancel-payment] cancellation email notify', err)),
    );
  }

  return NextResponse.json({ ok: true });
}
