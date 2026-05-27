export type BookingBlock = {
  date: string; // YYYY-MM-DD
  allDay: boolean;
  start?: string; // HH:mm
  end?: string; // HH:mm
  note?: string;
};

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export function normalizeBookingBlocks(raw: unknown): BookingBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: BookingBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const date = String(row.date ?? '').trim();
    if (!isIsoDate(date)) continue;
    const allDay = row.allDay === true;
    const start = String(row.start ?? '').trim();
    const end = String(row.end ?? '').trim();
    const note = String(row.note ?? '').trim();
    if (!allDay) {
      if (!isTime(start) || !isTime(end)) continue;
      if (toMinutes(end) <= toMinutes(start)) continue;
      out.push({ date, allDay: false, start, end, ...(note ? { note } : {}) });
      continue;
    }
    out.push({ date, allDay: true, ...(note ? { note } : {}) });
  }
  out.sort((a, b) => `${a.date}-${a.start ?? ''}`.localeCompare(`${b.date}-${b.start ?? ''}`));
  return out;
}

export function isDateBlockedAllDay(blocks: BookingBlock[], date: string): boolean {
  return blocks.some((b) => b.date === date && b.allDay);
}

export function isBlockedForStartTime(
  blocks: BookingBlock[],
  date: string,
  startTime: string,
  durationMin: number
): boolean {
  if (isDateBlockedAllDay(blocks, date)) return true;
  if (!isTime(startTime)) return false;
  const start = toMinutes(startTime);
  const end = start + Math.max(1, durationMin);
  for (const block of blocks) {
    if (block.date !== date || block.allDay || !block.start || !block.end) continue;
    const blockStart = toMinutes(block.start);
    const blockEnd = toMinutes(block.end);
    const overlaps = start < blockEnd && end > blockStart;
    if (overlaps) return true;
  }
  return false;
}

