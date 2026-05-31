import {
  externalEventDatesInRange,
  fetchIcsEventsFromUrl,
  filterExternalEventsInRange,
  type ExternalCalendarEvent,
} from '@/lib/external-calendar-ics';
import {
  listGoogleCalendarEvents,
  loadGoogleCalendarConnection,
  loadSalonExternalIcsUrl,
} from '@/lib/google-calendar';

export async function loadExternalCalendarEventsForRange(
  salonId: string,
  fromYmd: string,
  toYmd: string,
): Promise<ExternalCalendarEvent[]> {
  const [connection, icsUrl] = await Promise.all([
    loadGoogleCalendarConnection(salonId),
    loadSalonExternalIcsUrl(salonId),
  ]);

  const tasks: Promise<ExternalCalendarEvent[]>[] = [];

  if (connection) {
    tasks.push(
      listGoogleCalendarEvents(connection, fromYmd, toYmd).catch(() => []),
    );
  }

  if (icsUrl) {
    tasks.push(
      fetchIcsEventsFromUrl(icsUrl)
        .then((events) => filterExternalEventsInRange(events, fromYmd, toYmd))
        .catch(() => []),
    );
  }

  if (!tasks.length) return [];

  const batches = await Promise.all(tasks);
  const merged: ExternalCalendarEvent[] = [];
  const seen = new Set<string>();

  for (const batch of batches) {
    for (const ev of batch) {
      const key = `${ev.source}:${ev.id}:${ev.date}:${ev.startTime}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(ev);
    }
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
