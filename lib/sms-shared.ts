export const SMS_PACK_CREDITS = 100;
export const SMS_PACK_PRICE_CENTS = 900;
export const SMS_PACK_PRICE_EUR = 9;

/** Temporary kill-switch for Stripe SMS pack checkout. */
export const SMS_PACK_PURCHASE_ENABLED = false;

export const SMS_PACK_PURCHASE_DISABLED_MESSAGE =
  'Скоро — онлайн покупката на SMS пакети е временно недостъпна.';

export type SmsReminderMode = 'off' | '1h' | '24h_and_1h';

export function normalizeSmsReminderMode(raw: unknown): SmsReminderMode {
  const v = String(raw ?? '').trim();
  if (v === '1h' || v === '24h_and_1h') return v;
  return 'off';
}

export function smsCreditsPerBooking(mode: SmsReminderMode): number {
  if (mode === '1h') return 1;
  if (mode === '24h_and_1h') return 2;
  return 0;
}

/** Parse YYYY-MM-DD + HH:MM as Europe/Sofia wall clock. */
export function parseSofiaAppointment(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map((part) => Number(part));
  const want = { year, month, day, hour, minute };

  const matches = (ms: number) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Sofia',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(new Date(ms));

    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? -1);
    return (
      get('year') === want.year &&
      get('month') === want.month &&
      get('day') === want.day &&
      get('hour') === want.hour &&
      get('minute') === want.minute
    );
  };

  const anchor = Date.UTC(year, month - 1, day, hour - 2, minute, 0);
  for (let delta = -14 * 3600000; delta <= 14 * 3600000; delta += 60000) {
    if (matches(anchor + delta)) return new Date(anchor + delta);
  }

  return new Date(`${date}T${time}:00+02:00`);
}
