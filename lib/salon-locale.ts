import { normalizeLocale, type Locale } from '@/lib/i18n';

export function resolveSalonLocale(value: string | null | undefined): Locale {
  return normalizeLocale(value);
}

export function toLocaleTag(locale: Locale): string {
  return locale === 'en' ? 'en-US' : 'bg-BG';
}

export function isEnglishLocale(value: string | null | undefined): boolean {
  return resolveSalonLocale(value) === 'en';
}
