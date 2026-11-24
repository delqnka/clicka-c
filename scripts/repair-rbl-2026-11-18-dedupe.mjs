#!/usr/bin/env node
/**
 * One-time cleanup for Reset Body Lab, 18 Nov 2026.
 *
 * Problem: the date-specific overrides for 18.11 were written against original
 * times (10:20, 16:30, 17:30, 19:00) that no longer match the current recurring
 * Wednesday timetable (08:40, 10:00, 12:00, 14:00, 18:00, 19:00). As a result
 * the effective schedule for that day renders DUPLICATES (10:00 and 18:00 twice).
 *
 * Fix (per owner): the day should simply follow the recurring class schedule for
 * its weekday. Dropping all five 18.11 overrides returns the day to the clean
 * recurring Wednesday timetable — no duplicates, no leftovers. The recurring
 * weekly timetable, bookings and package credits are never modified.
 */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const salonId = '7e3190ef-6f27-4192-8f74-53af9b39f7aa';
const date = '2026-11-18';

// Guard: the recurring Wednesday timetable must exist before we rely on it.
const [salon] = await sql`SELECT opening_hours FROM salons WHERE id::text = ${salonId}`;
const wed = salon?.opening_hours?.class_schedule?.['3'];
if (!Array.isArray(wed) || wed.length === 0) {
  throw new Error('Repair guard failed: Wednesday timetable missing. No data changed.');
}

const removed = await sql`
  DELETE FROM class_schedule_overrides
  WHERE salon_id = ${salonId} AND original_date = ${date}
  RETURNING original_time, original_trainer, start_time, end_time, trainer, is_cancelled
`;

console.log(JSON.stringify({ date, removedOverrides: removed }, null, 2));
console.log('\nДенят вече следва повтарящия се график за сряда:');
for (const s of wed.slice().sort((a, b) => String(a.start).localeCompare(String(b.start)))) {
  console.log(`   ${s.start}-${s.end} ${s.trainer} ${JSON.stringify(s.className ?? '')}`);
}
