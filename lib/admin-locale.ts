import { cookies } from 'next/headers';
import type { Locale } from './i18n';
import { ADMIN_LOCALE_COOKIE } from './admin-locale-shared';

export function getAdminLocale(): Locale {
  const value = cookies().get(ADMIN_LOCALE_COOKIE)?.value;
  return value === 'en' ? 'en' : 'bg';
}
