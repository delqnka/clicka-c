import bg from '@/locales/bg.json';
import en from '@/locales/en.json';

export type Locale = 'bg' | 'en';

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

const dict: Record<Locale, typeof bg> = { bg, en: en as typeof bg };

function resolve(obj: unknown, keys: string[]): string | undefined {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

export function getT(locale: Locale): TFunc {
  const translations = dict[locale] ?? dict.bg;
  return function t(key: string, vars?: Record<string, string | number>): string {
    const parts = key.split('.');
    let value = resolve(translations, parts);
    if (value === undefined) {
      value = resolve(dict.bg, parts) ?? key;
    }
    return vars ? interpolate(value, vars) : value;
  };
}
