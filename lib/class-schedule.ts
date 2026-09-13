export type BookingClassSlot = {
  start: string;
  end: string;
  trainer: string;
  capacity: number;
};

export type BookingClassSchedule = Record<string, BookingClassSlot[]>;

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function normalizeTime(value: unknown): string {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return '';
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function timeToMinutes(value: string): number {
  const [hour = 0, minute = 0] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function normalizeDayKey(key: string): string | null {
  const trimmed = String(key ?? '').trim().toLowerCase();
  if (/^[0-6]$/.test(trimmed)) return trimmed;
  const index = DAY_NAME_TO_INDEX[trimmed];
  return typeof index === 'number' ? String(index) : null;
}

export function normalizeTrainerName(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase('bg-BG').replace(/\s+/g, ' ');
}

export function normalizeClassSchedule(raw: unknown): BookingClassSchedule {
  const schedule: BookingClassSchedule = {};
  if (!raw || typeof raw !== 'object') return schedule;

  for (const [rawDay, rawSlots] of Object.entries(raw as Record<string, unknown>)) {
    const dayKey = normalizeDayKey(rawDay);
    if (!dayKey || !Array.isArray(rawSlots)) continue;

    const slots = rawSlots
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const start = normalizeTime(row.start);
        const end = normalizeTime(row.end);
        const trainer = String(row.trainer ?? '').trim();
        const capacityRaw = Number(row.capacity);
        const capacity = Number.isFinite(capacityRaw)
          ? Math.max(1, Math.min(99, Math.round(capacityRaw)))
          : 1;

        if (!start || !end || !trainer) return null;
        if (timeToMinutes(end) <= timeToMinutes(start)) return null;

        return { start, end, trainer, capacity };
      })
      .filter((slot): slot is BookingClassSlot => slot !== null)
      .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

    if (slots.length > 0) schedule[dayKey] = slots;
  }

  return schedule;
}

export function getClassSlotsForDate(schedule: BookingClassSchedule, date: string): BookingClassSlot[] {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const dayKey = String(new Date(`${date}T12:00:00`).getDay());
  return schedule[dayKey] ?? [];
}

export function findClassSlotForBooking(
  schedule: BookingClassSchedule,
  date: string,
  time: string,
  trainer?: string | null,
): BookingClassSlot | null {
  const normalizedTime = normalizeTime(time);
  const normalizedTrainer = normalizeTrainerName(trainer);
  return (
    getClassSlotsForDate(schedule, date).find((slot) => {
      if (slot.start !== normalizedTime) return false;
      if (!normalizedTrainer) return true;
      return normalizeTrainerName(slot.trainer) === normalizedTrainer;
    }) ?? null
  );
}
