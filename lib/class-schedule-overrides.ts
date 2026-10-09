import 'server-only';

import { sql, sqlTransaction } from '@/lib/db';
import { normalizeClassScheduleOverrides, type ClassScheduleOverride } from '@/lib/class-schedule';
import { formatLegacyDateDMY } from '@/lib/booking-time';
import { ensureBookingsSchema } from '@/lib/ensure-bookings-schema';

let ensurePromise: Promise<void> | null = null;

export async function ensureClassScheduleOverridesSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
      await sql`
        CREATE TABLE IF NOT EXISTS class_schedule_overrides (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          salon_id text NOT NULL,
          original_date text NOT NULL,
          original_time text NOT NULL,
          original_class_name text NOT NULL DEFAULT '',
          original_trainer text NOT NULL DEFAULT '',
          date text NOT NULL,
          start_time text NOT NULL,
          end_time text NOT NULL,
          service_id text,
          class_name text,
          trainer text NOT NULL,
          capacity integer NOT NULL DEFAULT 1,
          price numeric,
          note text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS class_schedule_overrides_occurrence_uniq
        ON class_schedule_overrides(salon_id, original_date, original_time, original_class_name, original_trainer)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS class_schedule_overrides_salon_date_idx
        ON class_schedule_overrides(salon_id, date)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS class_schedule_overrides_salon_original_date_idx
        ON class_schedule_overrides(salon_id, original_date)
      `;
    })();
  }
  return ensurePromise;
}

function mapOverrideRow(row: Record<string, unknown>): ClassScheduleOverride {
  return {
    id: String(row.id ?? ''),
    salonId: String(row.salon_id ?? ''),
    originalDate: String(row.original_date ?? ''),
    originalTime: String(row.original_time ?? ''),
    originalClassName: String(row.original_class_name ?? ''),
    originalTrainer: String(row.original_trainer ?? ''),
    date: String(row.date ?? ''),
    start: String(row.start_time ?? ''),
    end: String(row.end_time ?? ''),
    serviceId: row.service_id ? String(row.service_id) : undefined,
    className: row.class_name ? String(row.class_name) : undefined,
    trainer: String(row.trainer ?? ''),
    capacity: Math.max(1, Math.round(Number(row.capacity ?? 1) || 1)),
    price: row.price == null ? undefined : Number(row.price),
    note: row.note ? String(row.note) : undefined,
  };
}

export async function listClassScheduleOverrides(
  salonId: string,
  from: string,
  to: string,
): Promise<ClassScheduleOverride[]> {
  await ensureClassScheduleOverridesSchema();
  const rows = await sql`
    SELECT *
    FROM class_schedule_overrides
    WHERE salon_id = ${salonId}
      AND (
        (date >= ${from} AND date <= ${to})
        OR (original_date >= ${from} AND original_date <= ${to})
      )
    ORDER BY date ASC, start_time ASC
  `;
  return normalizeClassScheduleOverrides(rows.map((row) => mapOverrideRow(row as Record<string, unknown>)));
}

export async function upsertClassScheduleOverride(
  salonId: string,
  input: ClassScheduleOverride,
): Promise<ClassScheduleOverride> {
  await ensureClassScheduleOverridesSchema();
  const [row] = await sql`
    INSERT INTO class_schedule_overrides (
      salon_id, original_date, original_time, original_class_name, original_trainer,
      date, start_time, end_time, service_id, class_name, trainer, capacity, price, note
    ) VALUES (
      ${salonId}, ${input.originalDate}, ${input.originalTime}, ${input.originalClassName}, ${input.originalTrainer},
      ${input.date}, ${input.start}, ${input.end}, ${input.serviceId ?? null}, ${input.className ?? null},
      ${input.trainer}, ${input.capacity}, ${input.price ?? null}, ${input.note ?? null}
    )
    ON CONFLICT (salon_id, original_date, original_time, original_class_name, original_trainer)
    DO UPDATE SET
      date = EXCLUDED.date,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      service_id = EXCLUDED.service_id,
      class_name = EXCLUDED.class_name,
      trainer = EXCLUDED.trainer,
      capacity = EXCLUDED.capacity,
      price = EXCLUDED.price,
      note = EXCLUDED.note,
      updated_at = now()
    RETURNING *
  `;
  return normalizeClassScheduleOverrides([mapOverrideRow(row as Record<string, unknown>)])[0]!;
}

export type UpdateClassOverrideBookingsOptions = {
  updateExistingBookings: boolean;
  originalEnd?: string;
  newStaffMemberId?: string | null;
  originalStaffMemberId?: string | null;
};

export type ClassScheduleOverrideMutationResult = {
  override: ClassScheduleOverride;
  updatedBookingsCount: number;
};

function minutesFromTime(value: string): number | null {
  const match = String(value ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

export async function upsertClassScheduleOverrideMutation(
  salonId: string,
  input: ClassScheduleOverride,
  options: UpdateClassOverrideBookingsOptions,
): Promise<ClassScheduleOverrideMutationResult> {
  await ensureClassScheduleOverridesSchema();
  await ensureBookingsSchema();

  const originalStart = minutesFromTime(input.originalTime);
  const originalEnd = minutesFromTime(options.originalEnd ?? '') ?? originalStart;
  const normalizedOriginalEnd = originalStart != null && originalEnd != null && originalEnd > originalStart
    ? originalEnd
    : originalStart == null
      ? null
      : originalStart + Math.max(5, minutesFromTime(input.end)! - minutesFromTime(input.start)!);
  const nextDuration = Math.max(5, (minutesFromTime(input.end) ?? 0) - (minutesFromTime(input.start) ?? 0));
  const hasClassName = Boolean(input.className?.trim());
  const shouldUpdateStaff = options.newStaffMemberId !== undefined;
  const hasOriginalStaff = Boolean(options.originalStaffMemberId);
  const legacyOriginalDate = formatLegacyDateDMY(input.originalDate) ?? input.originalDate;

  const [, updatedRows, overrideRows] = await sqlTransaction<[unknown[], Record<string, unknown>[], Record<string, unknown>[]]>((txn) => [
    txn`SELECT pg_advisory_xact_lock(hashtext(${`${salonId}:${input.originalDate}:${input.originalTime}:${input.originalTrainer}`}))`,
    options.updateExistingBookings
      ? txn`
          UPDATE bookings b
          SET
            date = ${input.date},
            time = ${input.start},
            service_duration = ${nextDuration},
            service_name = CASE WHEN ${hasClassName} THEN ${input.className ?? ''} ELSE service_name END,
            service_price = CASE WHEN ${input.price != null} THEN ${input.price ?? null} ELSE service_price END,
            staff_member_id = CASE
              WHEN ${shouldUpdateStaff} THEN ${options.newStaffMemberId ?? null}::uuid
              ELSE staff_member_id
            END
          WHERE b.salon_id = ${salonId}
            AND b.date IN (${input.originalDate}, ${legacyOriginalDate})
            AND lower(trim(coalesce(b.status, ''))) NOT IN ('cancelled', 'canceled', 'отказана', 'анулирана')
            AND (
              substring(trim(b.time) from '^\\d{1,2}:\\d{2}') = ${input.originalTime}
              OR (
                (
                  COALESCE(NULLIF(split_part(trim(b.time), ':', 1), '')::int, 0) * 60
                  + COALESCE(NULLIF(split_part(trim(b.time), ':', 2), '')::int, 0)
                ) < ${normalizedOriginalEnd ?? originalStart ?? 0}
                AND (
                  (
                    COALESCE(NULLIF(split_part(trim(b.time), ':', 1), '')::int, 0) * 60
                    + COALESCE(NULLIF(split_part(trim(b.time), ':', 2), '')::int, 0)
                  ) + GREATEST(5, COALESCE(b.service_duration, ${nextDuration}))
                ) > ${originalStart ?? 0}
              )
            )
            AND (
              ${!hasOriginalStaff}
              OR b.staff_member_id = ${options.originalStaffMemberId ?? null}::uuid
              OR b.staff_member_id IS NULL
            )
            AND (
              ${!input.originalClassName.trim()}
              OR lower(trim(b.service_name)) = lower(trim(${input.originalClassName}))
              OR lower(b.service_name) LIKE '%' || lower(trim(${input.originalClassName})) || '%'
              OR ${hasOriginalStaff}
            )
          RETURNING id
        `
      : txn`SELECT id FROM bookings WHERE false`,
    txn`
      INSERT INTO class_schedule_overrides (
        salon_id, original_date, original_time, original_class_name, original_trainer,
        date, start_time, end_time, service_id, class_name, trainer, capacity, price, note
      ) VALUES (
        ${salonId}, ${input.originalDate}, ${input.originalTime}, ${input.originalClassName}, ${input.originalTrainer},
        ${input.date}, ${input.start}, ${input.end}, ${input.serviceId ?? null}, ${input.className ?? null},
        ${input.trainer}, ${input.capacity}, ${input.price ?? null}, ${input.note ?? null}
      )
      ON CONFLICT (salon_id, original_date, original_time, original_class_name, original_trainer)
      DO UPDATE SET
        date = EXCLUDED.date,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        service_id = EXCLUDED.service_id,
        class_name = EXCLUDED.class_name,
        trainer = EXCLUDED.trainer,
        capacity = EXCLUDED.capacity,
        price = EXCLUDED.price,
        note = EXCLUDED.note,
        updated_at = now()
      RETURNING *
    `,
  ], { isolationMode: 'Serializable' });

  return {
    override: normalizeClassScheduleOverrides([mapOverrideRow(overrideRows[0] as Record<string, unknown>)])[0]!,
    updatedBookingsCount: updatedRows.length,
  };
}

export async function deleteClassScheduleOverride(
  salonId: string,
  originalDate: string,
  originalTime: string,
  originalClassName: string,
  originalTrainer: string,
) {
  await ensureClassScheduleOverridesSchema();
  await sql`
    DELETE FROM class_schedule_overrides
    WHERE salon_id = ${salonId}
      AND original_date = ${originalDate}
      AND original_time = ${originalTime}
      AND original_class_name = ${originalClassName}
      AND original_trainer = ${originalTrainer}
  `;
}
