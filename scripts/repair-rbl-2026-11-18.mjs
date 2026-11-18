#!/usr/bin/env node
/**
 * One-time reconciliation for Reset Body Lab, 18 Nov 2026.
 *
 * The day's real schedule was three Pilates Reformer sessions led by Йоанна:
 * 08:40 (5 guests), 10:00 (1 guest), 18:00 (3 guests).
 * This script only repairs the three known wrongly assigned bookings and
 * applies date-specific overrides; it never changes package credits or future
 * recurring slots.
 */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const salonId = '7e3190ef-6f27-4192-8f74-53af9b39f7aa';
const date = '2026-11-18';
const yoannaId = '46f9d6da-6e9d-43fc-87d3-ff12a5833490';
const zheniId = 'b3e02bd1-3802-4912-9124-7f7dcd77239a';
const wrongBookingIds = [
  'dbb2e0e4-7b2e-4eb4-a2c9-0cc7a4299008', // Миглена Розова
  'dd6acf5a-2d26-48ce-95a0-deb948c38def', // Киара
  '6ead1319-c921-411e-a674-7dcbadb765c5', // Светла
];

const expected = await sql`
  SELECT id, client_name, date, time, staff_member_id::text AS staff_member_id
  FROM bookings
  WHERE salon_id = ${salonId}
    AND id = ANY(${wrongBookingIds})
  ORDER BY id
`;
if (expected.length !== wrongBookingIds.length || expected.some((row) =>
  row.date !== date || row.time !== '08:40' || row.staff_member_id !== zheniId,
)) {
  throw new Error('Repair guard failed: the three targeted bookings are no longer in their expected state. No data was changed.');
}

const moved = await sql`
  UPDATE bookings
  SET staff_member_id = ${yoannaId}::uuid
  WHERE salon_id = ${salonId}
    AND id = ANY(${wrongBookingIds})
    AND staff_member_id = ${zheniId}::uuid
  RETURNING id, client_name
`;
if (moved.length !== wrongBookingIds.length) {
  throw new Error('Repair stopped: not every targeted booking could be reassigned. Check the partial result before rerunning.');
}

const overrides = [
  { originalTime: '08:40', originalTrainer: 'Йоанна', start: '08:40', end: '09:30', trainer: 'Йоанна', cancelled: false },
  { originalTime: '10:20', originalTrainer: 'Йоанна', start: '10:00', end: '10:50', trainer: 'Йоанна', cancelled: false },
  { originalTime: '16:30', originalTrainer: 'Жени', start: '18:00', end: '18:50', trainer: 'Йоанна', cancelled: false },
  { originalTime: '17:30', originalTrainer: 'Жени', start: '17:30', end: '18:20', trainer: 'Жени', cancelled: true },
  { originalTime: '19:00', originalTrainer: 'Жени', start: '19:00', end: '19:50', trainer: 'Жени', cancelled: true },
];

for (const item of overrides) {
  await sql`
    INSERT INTO class_schedule_overrides (
      salon_id, original_date, original_time, original_class_name, original_trainer,
      date, start_time, end_time, class_name, trainer, capacity, note, is_cancelled
    ) VALUES (
      ${salonId}, ${date}, ${item.originalTime}, 'Пилатес Реформър', ${item.originalTrainer},
      ${date}, ${item.start}, ${item.end}, 'Пилатес Реформър', ${item.trainer}, 5,
      'Корекция на графика от 18.11.2026', ${item.cancelled}
    )
    ON CONFLICT (salon_id, original_date, original_time, original_class_name, original_trainer)
    DO UPDATE SET
      date = EXCLUDED.date, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
      class_name = EXCLUDED.class_name, trainer = EXCLUDED.trainer, capacity = EXCLUDED.capacity,
      note = EXCLUDED.note, is_cancelled = EXCLUDED.is_cancelled, updated_at = now()
  `;
}

console.log(JSON.stringify({ reassigned: moved, overridesApplied: overrides.length }, null, 2));
