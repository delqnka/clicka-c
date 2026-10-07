import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { sql } from '@/lib/db';
import { ensureStaffSchema } from '@/lib/ensure-staff-schema';

type RevenueRow = {
  staff_id: string;
  staff_name: string;
  booked_classes_count: number | string | null;
  booked_people_count: number | string | null;
  booked_revenue: number | string | null;
  completed_classes_count: number | string | null;
  completed_people_count: number | string | null;
  completed_revenue: number | string | null;
  bookings: unknown;
};

function isIsoDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const from = request.nextUrl.searchParams.get('from');
  const to = request.nextUrl.searchParams.get('to');
  if (!isIsoDate(from) || !isIsoDate(to)) {
    return NextResponse.json({ error: 'Изберете валиден период.' }, { status: 400 });
  }

  await ensureStaffSchema();
  const rows = await sql`
    SELECT
      sm.id::text AS staff_id,
      sm.name AS staff_name,
      COALESCE(stats.booked_classes_count, 0) AS booked_classes_count,
      COALESCE(stats.booked_people_count, 0) AS booked_people_count,
      COALESCE(stats.booked_revenue, 0) AS booked_revenue,
      COALESCE(stats.completed_classes_count, 0) AS completed_classes_count,
      COALESCE(stats.completed_people_count, 0) AS completed_people_count,
      COALESCE(stats.completed_revenue, 0) AS completed_revenue,
      COALESCE(stats.bookings, '[]'::jsonb) AS bookings
    FROM staff_members sm
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS booked_classes_count,
        COALESCE(SUM(GREATEST(1, COALESCE(b.booking_quantity, 1))), 0)::int AS booked_people_count,
        COALESCE(SUM(COALESCE(b.service_price, 0) * GREATEST(1, COALESCE(b.booking_quantity, 1))), 0)::float AS booked_revenue,
        COUNT(*) FILTER (
          WHERE
            lower(trim(coalesce(b.status, ''))) = 'completed'
            OR CASE
              WHEN b.date ~ '^\\d{4}-\\d{2}-\\d{2}$' AND b.time ~ '^\\d{1,2}:\\d{2}'
                THEN (
                  b.date::date < CURRENT_DATE
                  OR (
                    b.date::date = CURRENT_DATE
                    AND substring(b.time from '^\\d{1,2}:\\d{2}')::time <= LOCALTIME
                  )
                )
              ELSE false
            END
        )::int AS completed_classes_count,
        COALESCE(SUM(GREATEST(1, COALESCE(b.booking_quantity, 1))) FILTER (
          WHERE
            lower(trim(coalesce(b.status, ''))) = 'completed'
            OR CASE
              WHEN b.date ~ '^\\d{4}-\\d{2}-\\d{2}$' AND b.time ~ '^\\d{1,2}:\\d{2}'
                THEN (
                  b.date::date < CURRENT_DATE
                  OR (
                    b.date::date = CURRENT_DATE
                    AND substring(b.time from '^\\d{1,2}:\\d{2}')::time <= LOCALTIME
                  )
                )
              ELSE false
            END
        ), 0)::int AS completed_people_count,
        COALESCE(SUM(COALESCE(b.service_price, 0) * GREATEST(1, COALESCE(b.booking_quantity, 1))) FILTER (
          WHERE
            lower(trim(coalesce(b.status, ''))) = 'completed'
            OR CASE
              WHEN b.date ~ '^\\d{4}-\\d{2}-\\d{2}$' AND b.time ~ '^\\d{1,2}:\\d{2}'
                THEN (
                  b.date::date < CURRENT_DATE
                  OR (
                    b.date::date = CURRENT_DATE
                    AND substring(b.time from '^\\d{1,2}:\\d{2}')::time <= LOCALTIME
                  )
                )
              ELSE false
            END
        ), 0)::float AS completed_revenue,
        COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', b.id,
            'clientName', b.client_name,
            'serviceName', b.service_name,
            'date', b.date,
            'time', b.time,
            'peopleCount', GREATEST(1, COALESCE(b.booking_quantity, 1)),
            'revenue', COALESCE(b.service_price, 0) * GREATEST(1, COALESCE(b.booking_quantity, 1)),
            'status', b.status
          )
          ORDER BY b.date ASC, b.time ASC, b.created_at ASC
        ) FILTER (WHERE b.id IS NOT NULL), '[]'::jsonb) AS bookings
      FROM bookings b
      WHERE b.salon_id = sm.salon_id
        AND b.staff_member_id = sm.id
        AND b.date ~ '^\\d{4}-\\d{2}-\\d{2}$'
        AND b.date::date BETWEEN ${from}::date AND ${to}::date
        AND lower(trim(coalesce(b.status, ''))) NOT IN ('cancelled', 'canceled', 'отказана', 'анулирана')
    ) stats ON true
    WHERE sm.salon_id = ${auth.salon.salonId}
      AND sm.is_owner = false
    ORDER BY sm.created_at ASC
  ` as RevenueRow[];

  return NextResponse.json({
    from,
    to,
    staff: rows.map((row) => ({
      staffId: row.staff_id,
      staffName: row.staff_name,
      bookedClassesCount: Math.max(0, Math.round(Number(row.booked_classes_count ?? 0) || 0)),
      bookedPeopleCount: Math.max(0, Math.round(Number(row.booked_people_count ?? 0) || 0)),
      bookedRevenue: Math.max(0, Number(row.booked_revenue ?? 0) || 0),
      completedClassesCount: Math.max(0, Math.round(Number(row.completed_classes_count ?? 0) || 0)),
      completedPeopleCount: Math.max(0, Math.round(Number(row.completed_people_count ?? 0) || 0)),
      completedRevenue: Math.max(0, Number(row.completed_revenue ?? 0) || 0),
      bookings: Array.isArray(row.bookings) ? row.bookings : [],
    })),
  });
}
