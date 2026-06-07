import {
  externalEventDatesInRange,
  fetchIcsEventsFromUrl,
  filterExternalEventsInRange,
  type ExternalCalendarEvent,
} from '@/lib/external-calendar-ics';
import { loadSalonExternalIcsUrl } from '@/lib/calendar-feed';

export async function loadExternalCalendarEventsForRange(
  salonId: string,
  fromYmd: string,
  toYmd: string,
): Promise<ExternalCalendarEvent[]> {
  const icsUrl = await loadSalonExternalIcsUrl(salonId);

  if (!icsUrl) return [];

  const events = await fetchIcsEventsFromUrl(icsUrl)
    .then((events) => filterExternalEventsInRange(events, fromYmd, toYmd))
    .catch(() => []);

  const merged: ExternalCalendarEvent[] = [];
  const seen = new Set<string>();

  for (const ev of events) {
    const key = `${ev.source}:${ev.id}:${ev.date}:${ev.startTime}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(ev);
  }

  merged.sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  return merged;
}

export async function loadExternalCalendarMarkedDates(
  salonId: string,
  fromYmd: string,
  toYmd: string,
): Promise<Set<string>> {
  const events = await loadExternalCalendarEventsForRange(salonId, fromYmd, toYmd);
  return externalEventDatesInRange(events, fromYmd, toYmd);
}
