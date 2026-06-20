import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendGoogleReviewInvitation } from '@/lib/resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get('x-cron-secret') === secret;
}

// Daily: find today's confirmed bookings whose appointment time has passed
// (≥1h ago), mark them completed, and send a Google review invitation email.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let reviewsSent = 0;

  const reviewRows = (await sql`
    SELECT
      b.id AS booking_id,
      b.client_email,
      b.client_name,
      CAST(s.id AS text) AS salon_id,
      s.google_place_id,
      s.name  AS salon_name,
      s.slug  AS salon_slug
    FROM bookings b
    JOIN salons s ON s.id::text = b.salon_id::text
    WHERE b.date::date = CURRENT_DATE
      AND b.time::time <= (NOW() AT TIME ZONE 'Europe/Sofia' - INTERVAL '1 hour')::time
      AND b.status = 'confirmed'
      AND b.google_review_invite_sent_at IS NULL
      AND s.google_place_id IS NOT NULL
      AND s.google_place_id <> ''
      AND b.client_email IS NOT NULL
      AND b.client_email <> ''
    LIMIT 200
  `) as Array<{
    booking_id: string;
    client_email: string;
    client_name: string;
    salon_id: string;
    google_place_id: string;
    salon_name: string;
    salon_slug: string;
  }>;

  for (const r of reviewRows) {
    const locked = await sql`
      UPDATE bookings
      SET status = 'completed',
          completed_at = now(),
          google_review_invite_sent_at = now()
      WHERE id = ${r.booking_id}
        AND status = 'confirmed'
        AND google_review_invite_sent_at IS NULL
      RETURNING id
    `;
    if (locked.length === 0) continue;

    try {
      await sendGoogleReviewInvitation(
        r.client_email,
        r.client_name,
        r.salon_name,
        r.google_place_id,
        r.salon_slug,
        r.salon_id,
      );
      reviewsSent++;
    } catch (err) {
      console.error('[review-cron] send failed', r.booking_id, err);
    }
  }

  return NextResponse.json({ ok: true, reviewsSent, checked: reviewRows.length });
}
