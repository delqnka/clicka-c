import type { Locale } from '@/lib/i18n';

const ADMIN_DAYS_BG = [
  { key: 'monday', label: 'Понеделник', shortLabel: 'Пн' },
  { key: 'tuesday', label: 'Вторник', shortLabel: 'Вт' },
  { key: 'wednesday', label: 'Сряда', shortLabel: 'Ср' },
  { key: 'thursday', label: 'Четвъртък', shortLabel: 'Чт' },
  { key: 'friday', label: 'Петък', shortLabel: 'Пт' },
  { key: 'saturday', label: 'Събота', shortLabel: 'Сб' },
  { key: 'sunday', label: 'Неделя', shortLabel: 'Нд' },
] as const;

const ADMIN_DAYS_EN = [
  { key: 'monday', label: 'Monday', shortLabel: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', shortLabel: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', shortLabel: 'Wed' },
  { key: 'thursday', label: 'Thursday', shortLabel: 'Thu' },
  { key: 'friday', label: 'Friday', shortLabel: 'Fri' },
  { key: 'saturday', label: 'Saturday', shortLabel: 'Sat' },
  { key: 'sunday', label: 'Sunday', shortLabel: 'Sun' },
] as const;

export const ADMIN_DAYS = ADMIN_DAYS_BG;

export function getAdminDays(locale: Locale) {
  return locale === 'en' ? ADMIN_DAYS_EN : ADMIN_DAYS_BG;
}

export const GOOGLE_PLACE_ID_FINDER_URL =
  'https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder';
