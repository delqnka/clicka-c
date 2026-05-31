import type { BookingBlock } from '@/lib/booking-blocks';

const SOFIA_TZ = 'Europe/Sofia';

function todaySofia(): Date {
  const now = new Date();
  const str = now.toLocaleDateString('en-CA', { timeZone: SOFIA_TZ });
  return new Date(`${str}T12:00:00`);
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const BG_MONTHS: Record<string, number> = {
  януари: 0, февруари: 1, март: 2, април: 3, май: 4, юни: 5,
  юли: 6, август: 7, септември: 8, октомври: 9, ноември: 10, декември: 11,
  ян: 0, фев: 1, мар: 2, апр: 3, юн: 5, юл: 6, авг: 7, сеп: 8, окт: 9, ное: 10, дек: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7,
  september: 8, october: 9, november: 10, december: 11,
};

const BG_WEEKDAYS: Record<string, number> = {
  понеделник: 1, вторник: 2, сряда: 3, четвъртък: 4, петък: 5, събота: 6, неделя: 0,
  пон: 1, вт: 2, ср: 3, чет: 4, пет: 5, съб: 6, нед: 0,
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0,
  mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0,
};

function parseTimeHHMM(raw: string): string | null {
  const m = raw.match(/(\d{1,2})[:\.](\d{2})/);
  if (!m) {
    const hOnly = raw.match(/^(\d{1,2})$/);
    if (hOnly) {
      const h = Number(hOnly[1]);
      if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
    }
    return null;
  }
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(h * 60 + m + mins, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function resolveDate(text: string): string | null {
  const lower = text.toLowerCase().trim();
  const today = todaySofia();

  if (lower === 'днес' || lower === 'today') return formatYmd(today);
  if (lower === 'утре' || lower === 'tomorrow') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return formatYmd(d);
  }
  if (lower === 'вдругиден') {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return formatYmd(d);
  }

  for (const [name, dow] of Object.entries(BG_WEEKDAYS)) {
    if (lower === name) {
      const d = new Date(today);
      const diff = (dow - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return formatYmd(d);
    }
  }

  // "5 юни", "5 юни 2026", "June 5"
  const bgDate = lower.match(/(\d{1,2})\s+([а-яa-z]+)(?:\s+(\d{4}))?/);
  if (bgDate) {
    const day = Number(bgDate[1]);
    const monthName = bgDate[2];
    const year = bgDate[3] ? Number(bgDate[3]) : today.getFullYear();
    const monthIdx = BG_MONTHS[monthName];
    if (monthIdx != null && day >= 1 && day <= 31) {
      return `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // "юни 5"
  const bgDateReversed = lower.match(/([а-яa-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?/);
  if (bgDateReversed) {
    const monthName = bgDateReversed[1];
    const day = Number(bgDateReversed[2]);
    const year = bgDateReversed[3] ? Number(bgDateReversed[3]) : today.getFullYear();
    const monthIdx = BG_MONTHS[monthName];
    if (monthIdx != null && day >= 1 && day <= 31) {
      return `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  const numDate = lower.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (numDate) {
    const day = Number(numDate[1]);
    const month = Number(numDate[2]);
    let year = Number(numDate[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // DD.MM (without year)
  const shortDate = lower.match(/(\d{1,2})[./-](\d{1,2})(?!\d)/);
  if (shortDate) {
    const day = Number(shortDate[1]);
    const month = Number(shortDate[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${today.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // YYYY-MM-DD
  const isoDate = lower.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return isoDate[0];

  return null;
}

export type ParsedBlock = {
  date: string;
  start: string;
  end: string;
  note: string;
};

export function parseBlockFromMessage(text: string): ParsedBlock | null {
  if (!text || text.length > 2000) return null;

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const full = lines.join(' ');

  // Extract all times from the message
  const timePattern = /(\d{1,2})[:\.](\d{2})/g;
  const times: string[] = [];
  let tm: RegExpExecArray | null;
  while ((tm = timePattern.exec(full)) !== null) {
    const parsed = parseTimeHHMM(tm[0]);
    if (parsed) times.push(parsed);
  }

  // Try to find a time range: "14:00-16:00" or "14:00 - 16:00" or "от 14:00 до 16:00"
  const rangePattern = /(\d{1,2}[:\.]?\d{0,2})\s*[-–—до]\s*(\d{1,2}[:\.]?\d{0,2})/i;
  const rangeMatch = full.match(rangePattern);

  let startTime: string | null = null;
  let endTime: string | null = null;

  if (rangeMatch) {
    startTime = parseTimeHHMM(rangeMatch[1]);
    endTime = parseTimeHHMM(rangeMatch[2]);
  }

  // If no range found, try single time + duration
  if (!startTime && times.length >= 1) {
    startTime = times[0];
    if (times.length >= 2 && !endTime) {
      endTime = times[1];
    }
  }

  if (!startTime) return null;

  // Look for duration: "60 мин", "1 час", "1.5 часа"
  if (!endTime) {
    const durMin = full.match(/(\d+)\s*мин/i);
    const durHour = full.match(/(\d+(?:[.,]\d+)?)\s*час/i);
    if (durMin) {
      endTime = addMinutes(startTime, Number(durMin[1]));
    } else if (durHour) {
      const hours = Number(durHour[1].replace(',', '.'));
      endTime = addMinutes(startTime, Math.round(hours * 60));
    } else {
      endTime = addMinutes(startTime, 60);
    }
  }

  // Resolve date
  let date = resolveDate(full);

  // If no date found, try each line individually
  if (!date) {
    for (const line of lines) {
      date = resolveDate(line);
      if (date) break;
    }
  }

  // Default to today if no date found
  if (!date) {
    date = formatYmd(todaySofia());
  }

  // Build note from original message (truncated)
  const note = full.length > 120 ? full.slice(0, 117) + '...' : full;

  return { date, start: startTime, end: endTime, note };
}

export function parsedBlockToBookingBlock(parsed: ParsedBlock): BookingBlock {
  return {
    date: parsed.date,
    allDay: false,
    start: parsed.start,
    end: parsed.end,
    note: parsed.note,
  };
}

export function formatBlockConfirmation(parsed: ParsedBlock): string {
  const d = new Date(`${parsed.date}T12:00:00`);
  const dateStr = d.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' });
  return `🔒 <b>Блокиран час</b>\n📅 ${dateStr}\n⏰ ${parsed.start} – ${parsed.end}`;
}
