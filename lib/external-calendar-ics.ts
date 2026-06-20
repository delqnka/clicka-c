import { parseSofiaAppointment } from '@/lib/sofia-time';

export type ExternalCalendarEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  source: 'google' | 'ics';
};

const SOFIA_TZ = 'Europe/Sofia';

function normalizeIcsUrl(raw: string): string {
  return String(raw ?? '')
    .trim()
    .replace(/^webcal:\/\//i, 'https://')
    .replace(/^http:\/\//i, 'https://');
}

function unfoldIcs(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

function parseIcsPropertyBlock(block: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of block.split('\n')) {
    if (!line || line.startsWith('BEGIN:') || line.startsWith('END:')) continue;
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const keyPart = line.slice(0, idx);
    const value = line.slice(idx + 1).trim();
    const key = keyPart.split(';')[0]?.toUpperCase() ?? keyPart.toUpperCase();
    map.set(key, value);
  }
  return map;
}

function parseIcsLocalDateTime(raw: string): Date | null {
  const clean = raw.trim();
  if (/^\d{8}$/.test(clean)) {
    const y = Number(clean.slice(0, 4));
    const m = Number(clean.slice(4, 6));
    const d = Number(clean.slice(6, 8));
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, ys, ms, ds, hs, mins] = match;
  return parseSofiaAppointment(`${ys}-${ms}-${ds}`, `${hs}:${mins}`);
}

function toYmdSofia(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SOFIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function toHmSofia(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SOFIA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('hour')}:${get('minute')}`;
}

export function parseIcsEvents(icsText: string): ExternalCalendarEvent[] {
  const unfolded = unfoldIcs(icsText);
  const chunks = unfolded.split('BEGIN:VEVENT').slice(1);
  const events: ExternalCalendarEvent[] = [];

  for (const chunk of chunks) {
    const body = chunk.split('END:VEVENT')[0] ?? '';
    const props = parseIcsPropertyBlock(body);
    const uid = props.get('UID') || `ics-${events.length + 1}`;
    const summary = (props.get('SUMMARY') || 'Събитие').replace(/\\n/g, ' ').replace(/\\,/g, ',');
    const dtStartRaw = props.get('DTSTART') || '';
    const dtEndRaw = props.get('DTEND') || dtStartRaw;
    const allDay = !dtStartRaw.includes('T');
    const start = parseIcsLocalDateTime(dtStartRaw);
    const end = parseIcsLocalDateTime(dtEndRaw);
    if (!start) continue;

    const endDate = end && end.getTime() > start.getTime() ? end : new Date(start.getTime() + 60 * 60_000);

    events.push({
      id: uid.slice(0, 256),
      title: summary,
      date: toYmdSofia(start),
      startTime: allDay ? '00:00' : toHmSofia(start),
      endTime: allDay ? '23:59' : toHmSofia(endDate),
      allDay,
      source: 'ics',
    });
  }

  return events;
}

export async function fetchIcsEventsFromUrl(url: string): Promise<ExternalCalendarEvent[]> {
  const normalized = normalizeIcsUrl(url);
  if (!normalized.startsWith('https://')) return [];

  const res = await fetch(normalized, {
    headers: { Accept: 'text/calendar,*/*' },
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return [];
  const text = await res.text();
  return parseIcsEvents(text);
}

export function filterExternalEventsInRange(
  events: ExternalCalendarEvent[],
  fromYmd: string,
  toYmd: string,
): ExternalCalendarEvent[] {
  return events.filter((ev) => ev.date >= fromYmd && ev.date <= toYmd);
}

export function externalEventDatesInRange(
  events: ExternalCalendarEvent[],
  fromYmd: string,
  toYmd: string,
): Set<string> {
  const set = new Set<string>();
  for (const ev of filterExternalEventsInRange(events, fromYmd, toYmd)) {
    set.add(ev.date);
  }
  return set;
}
