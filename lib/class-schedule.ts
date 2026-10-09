export type BookingClassSlot = {
  start: string;
  end: string;
  serviceId?: string;
  className?: string;
  trainer: string;
  capacity: number;
  price?: number;
  note?: string;
};

export type BookingClassSchedule = Record<string, BookingClassSlot[]>;

export type ClassScheduleOverride = {
  id?: string;
  salonId?: string;
  originalDate: string;
  originalTime: string;
  originalClassName: string;
  originalTrainer: string;
  date: string;
  start: string;
  end: string;
  serviceId?: string;
  className?: string;
  trainer: string;
  capacity: number;
  price?: number;
  note?: string;
};

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
        const serviceId = String(row.serviceId ?? row.service_id ?? row.service ?? '').trim();
        const className = String(row.className ?? row.class_name ?? row.name ?? row.title ?? '').trim();
        const trainer = String(row.trainer ?? '').trim();
        const priceRaw = Number(row.price);
        const price = Number.isFinite(priceRaw) && priceRaw >= 0 ? priceRaw : null;
        const note = String(row.note ?? '').trim();
        const capacityRaw = Number(row.capacity);
        const capacity = Number.isFinite(capacityRaw)
          ? Math.max(1, Math.min(99, Math.round(capacityRaw)))
          : 1;

        if (!start || !end || !trainer) return null;
        if (timeToMinutes(end) <= timeToMinutes(start)) return null;

        return {
          start,
          end,
          ...(serviceId ? { serviceId } : {}),
          ...(className ? { className } : {}),
          trainer,
          capacity,
          ...(price != null ? { price } : {}),
          ...(note ? { note } : {}),
        };
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

function normalizeDate(value: unknown): string {
  const text = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

export function normalizeClassScheduleOverrides(raw: unknown): ClassScheduleOverride[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const originalDate = normalizeDate(row.originalDate ?? row.original_date);
      const originalTime = normalizeTime(row.originalTime ?? row.original_time);
      const originalClassName = String(row.originalClassName ?? row.original_class_name ?? '').trim();
      const originalTrainer = String(row.originalTrainer ?? row.original_trainer ?? '').trim();
      const date = normalizeDate(row.date);
      const start = normalizeTime(row.start ?? row.startTime ?? row.start_time);
      const end = normalizeTime(row.end ?? row.endTime ?? row.end_time);
      const serviceId = String(row.serviceId ?? row.service_id ?? '').trim();
      const className = String(row.className ?? row.class_name ?? '').trim();
      const trainer = String(row.trainer ?? '').trim();
      const capacityRaw = Number(row.capacity);
      const priceRaw = Number(row.price);
      const note = String(row.note ?? '').trim();
      const capacity = Number.isFinite(capacityRaw)
        ? Math.max(1, Math.min(99, Math.round(capacityRaw)))
        : 1;
      const price = Number.isFinite(priceRaw) && priceRaw >= 0 ? priceRaw : null;

      if (!originalDate || !originalTime || !date || !start || !end || !trainer) return null;
      if (timeToMinutes(end) <= timeToMinutes(start)) return null;

      return {
        ...(row.id ? { id: String(row.id) } : {}),
        ...(row.salonId ?? row.salon_id ? { salonId: String(row.salonId ?? row.salon_id) } : {}),
        originalDate,
        originalTime,
        originalClassName,
        originalTrainer,
        date,
        start,
        end,
        ...(serviceId ? { serviceId } : {}),
        ...(className ? { className } : {}),
        trainer,
        capacity,
        ...(price != null ? { price } : {}),
        ...(note ? { note } : {}),
      };
    })
    .filter((item): item is ClassScheduleOverride => item !== null);
}

export function classSlotMatchesOverrideOriginal(
  slot: BookingClassSlot,
  override: Pick<ClassScheduleOverride, 'originalTime' | 'originalClassName' | 'originalTrainer'>,
): boolean {
  return (
    slot.start === override.originalTime &&
    normalizeTrainerName(slot.trainer) === normalizeTrainerName(override.originalTrainer) &&
    normalizeTrainerName(slot.className ?? '') === normalizeTrainerName(override.originalClassName)
  );
}

export function getClassSlotsForDateWithOverrides(
  schedule: BookingClassSchedule,
  date: string,
  rawOverrides: unknown,
): BookingClassSlot[] {
  const base = getClassSlotsForDate(schedule, date).slice();
  const overrides = normalizeClassScheduleOverrides(rawOverrides);
  const withoutOriginals = base.filter((slot) => {
    return !overrides.some((override) => (
      override.originalDate === date && classSlotMatchesOverrideOriginal(slot, override)
    ));
  });
  const inserted = overrides
    .filter((override) => override.date === date)
    .map((override): BookingClassSlot => ({
      start: override.start,
      end: override.end,
      ...(override.serviceId ? { serviceId: override.serviceId } : {}),
      ...(override.className ? { className: override.className } : {}),
      trainer: override.trainer,
      capacity: override.capacity,
      ...(override.price != null ? { price: override.price } : {}),
      ...(override.note ? { note: override.note } : {}),
    }));
  return [...withoutOriginals, ...inserted].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
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
