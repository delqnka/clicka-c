import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { consumePackageForCompletedBooking } from '@/lib/client-packages';

/** Apply one package credit to an existing reservation from the admin schedule. */
export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: { bookingId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }
  const bookingId = body.bookingId?.trim();
  if (!bookingId) return NextResponse.json({ error: 'Липсва резервация.' }, { status: 400 });

  const rows = await sql`
    SELECT id, client_name, client_phone, client_email, COALESCE(booking_quantity, 1) AS booking_quantity
    FROM bookings
    WHERE CAST(id AS text) = ${bookingId}
      AND salon_id = ${auth.salon.salonId}
    LIMIT 1
  ` as { id: string; client_name: string; client_phone: string | null; client_email: string | null; booking_quantity: number | string }[];
  const booking = rows[0];
  if (!booking) return NextResponse.json({ error: 'Резервацията не е намерена.' }, { status: 404 });

  // A package credit belongs to one person. A multi-bed booking (one client
  // holding several spots for friends) must not draw a single credit for the
  // whole group — each attendee needs their own booking and their own package.
  if (Math.max(1, Math.round(Number(booking.booking_quantity) || 1)) > 1) {
    return NextResponse.json(
      { error: 'Тази резервация е за няколко места. Кредит се прилага на отделна резервация за един човек, не за цялата група.' },
      { status: 409 },
    );
  }

  const packageUsage = await consumePackageForCompletedBooking({
    salonId: auth.salon.salonId,
    bookingId: String(booking.id),
    clientName: booking.client_name,
    clientPhone: booking.client_phone,
    clientEmail: booking.client_email,
  });
  if (!packageUsage) {
    return NextResponse.json(
      { error: 'Не открихме свободен активен кредит за този клиент.' },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, packageUsage });
}
