import { parseSofiaAppointment } from '@/lib/sofia-time';
import { BRAND } from '@/lib/brand';

export type CalendarBookingRow = {
  id: string;
  client_name: string;
  client_phone?: string | null;
  client_email?: string | null;
  service_name: string;
  service_duration?: number | null;
  date: string;
  time: string;
  status: string;
  notes?: string | null;
};

const SOFIA_TZ = 'Europe/Sofia';

function escapeIcsText(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatIcsLocal(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SOFIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}${get('month')}${get('day')}T${get('hour')}${get('minute')}${get('second')}`;
}

function bookingWindow(booking: CalendarBookingRow): { start: Date; end: Date } {
  const start = parseSofiaAppointment(booking.date, booking.time);
  const durationMin = Math.max(5, Number(booking.service_duration ?? 30) || 30);
  const end = new Date(start.getTime() + durationMin * 60_000);
  return { start, end };
}

export function bookingDescription(booking: CalendarBookingRow, salonName?: string): string {
  const lines = [
    `Клиент: ${booking.client_name}`,
    booking.client_phone ? `Телефон: ${booking.client_phone}` : '',
    booking.client_email ? `Имейл: ${booking.client_email}` : '',
    booking.notes ? `Бележка: ${booking.notes}` : '',
    salonName ? `Резервирано в ${salonName}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

export function buildBookingIcsEvent(booking: CalendarBookingRow, salonName: string): string {
  const { start, end } = bookingWindow(booking);
  const uid = `booking-${booking.id}@${BRAND.domain}`;
  const now = formatIcsLocal(new Date());
  const statusLabel =
    booking.status === 'confirmed'
      ? 'Потвърдена'
      : booking.status === 'pending'
        ? 'Чака потвърждение'
        : booking.status;

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=${SOFIA_TZ}:${formatIcsLocal(start)}`,
    `DTEND;TZID=${SOFIA_TZ}:${formatIcsLocal(end)}`,
    `SUMMARY:${escapeIcsText(`${booking.client_name} – ${booking.service_name}`)}`,
    `DESCRIPTION:${escapeIcsText(`${statusLabel}\n${bookingDescription(booking, salonName)}`)}`,
    `LOCATION:${escapeIcsText(salonName)}`,
    booking.status === 'pending' ? 'STATUS:TENTATIVE' : 'STATUS:CONFIRMED',
    'END:VEVENT',
  ].join('\r\n');
}

const VTIMEZONE_SOFIA = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Sofia',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0300',
  'TZOFFSETTO:+0200',
  'TZNAME:EET',
  'DTSTART:19701025T040000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0300',
  'TZNAME:EEST',
  'DTSTART:19700329T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'END:VTIMEZONE',
].join('\r\n');

export function buildSalonCalendarFeed(
  salonName: string,
  bookings: CalendarBookingRow[],
): string {
  const events = bookings.map((booking) => buildBookingIcsEvent(booking, salonName)).join('\r\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${BRAND.name}//Salon Calendar//BG`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + escapeIcsText(`${salonName} – резервации`),
    VTIMEZONE_SOFIA,
    events,
    'END:VCALENDAR',
  ].join('\r\n');
}

/** Google Calendar “Add event” URL (no OAuth). */
export function buildGoogleCalendarAddUrl(opts: {
  title: string;
  start: Date;
  end: Date;
  details?: string;
  location?: string;
}): string {
  const fmt = (date: Date) => formatIcsLocal(date);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${fmt(opts.start)}/${fmt(opts.end)}`,
  });
  if (opts.details) params.set('details', opts.details);
  if (opts.location) params.set('location', opts.location);
  params.set('ctz', SOFIA_TZ);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildBookingCalendarLinks(
  booking: CalendarBookingRow,
  salonName: string,
  salonAddress?: string,
): { googleUrl: string; icsContent: string } {
  const { start, end } = bookingWindow(booking);
  const title = `${booking.service_name} – ${salonName}`;
  const googleUrl = buildGoogleCalendarAddUrl({
    title,
    start,
    end,
    details: bookingDescription(booking, salonName),
    location: salonAddress,
  });
  const icsContent = buildSalonCalendarFeed(salonName, [booking]);
  return { googleUrl, icsContent };
}
