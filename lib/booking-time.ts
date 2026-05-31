const CANCELLED_STATUSES = new Set(['cancelled', 'canceled', 'отказана', 'анулирана']);

export function parseTimeToMinutes(raw: unknown): number | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function formatLegacyDateDMY(dateStr: string): string | null {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());
  return `${day}.${month}.${year}`;
}

export function isCancelledStatus(raw: unknown): boolean {
  const s = String(raw ?? '').trim().toLowerCase();
  return CANCELLED_STATUSES.has(s);
}

export function bookingStartMinutesFromTimeString(time: string): number {
  const parsed = parseTimeToMinutes(time);
  if (parsed == null) return 0;
  return parsed;
}
