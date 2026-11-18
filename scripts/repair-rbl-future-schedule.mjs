#!/usr/bin/env node
/** Reconcile future Reset Body Lab bookings to the configured class schedule. */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const salonId = '7e3190ef-6f27-4192-8f74-53af9b39f7aa';
const yoannaId = '46f9d6da-6e9d-43fc-87d3-ff12a5833490';
const zheniId = 'b3e02bd1-3802-4912-9124-7f7dcd77239a';

const fixes = [
  { date: '2026-11-19', time: '08:40', staffId: zheniId },
  { date: '2026-11-19', time: '10:00', staffId: zheniId },
  { date: '2026-11-25', time: '08:40', staffId: yoannaId },
  { date: '2026-11-26', time: '08:40', staffId: zheniId },
  { date: '2026-11-26', time: '10:00', staffId: zheniId },
];

const [salon] = await sql`
  SELECT opening_hours FROM salons WHERE id::text = ${salonId} FOR UPDATE
`;
if (!salon || !salon.opening_hours || typeof salon.opening_hours !== 'object') {
  throw new Error('Repair guard failed: class schedule is missing. No data was changed.');
}
const openingHours = salon.opening_hours;
const schedule = openingHours.class_schedule;
if (!schedule || typeof schedule !== 'object' || !Array.isArray(schedule['3'])) {
  throw new Error('Repair guard failed: Wednesday schedule is missing. No data was changed.');
}
const wednesday = schedule['3'];
const phantomIndex = wednesday.findIndex((slot) => (
  slot && typeof slot === 'object'
  && slot.start === '11:00'
  && String(slot.trainer ?? '').trim() === 'Ива'
  && String(slot.className ?? '').trim() === 'Пилатес Реформър'
));
if (phantomIndex === -1) {
  throw new Error('Repair guard failed: the unwanted Wednesday 11:00 class is not present. No data was changed.');
}

const changed = [];
for (const fix of fixes) {
  const rows = await sql`
    UPDATE bookings
    SET staff_member_id = ${fix.staffId}::uuid
    WHERE salon_id = ${salonId}
      AND date = ${fix.date}
      AND time = ${fix.time}
      AND lower(trim(coalesce(status, ''))) NOT IN ('cancelled', 'canceled', 'отказана', 'анулирана')
      AND staff_member_id IS DISTINCT FROM ${fix.staffId}::uuid
    RETURNING id, client_name, date, time
  `;
  changed.push(...rows);
}

const nextWednesday = wednesday.filter((_, index) => index !== phantomIndex);
const nextOpeningHours = { ...openingHours, class_schedule: { ...schedule, '3': nextWednesday } };
await sql`
  UPDATE salons
  SET opening_hours = ${JSON.stringify(nextOpeningHours)}::jsonb, updated_at = now()
  WHERE id::text = ${salonId}
`;

console.log(JSON.stringify({ reassignedBookings: changed, removedWeeklyClass: 'Wednesday 11:00 Ива' }, null, 2));
