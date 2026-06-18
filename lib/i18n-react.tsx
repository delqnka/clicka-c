'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { getT, type Locale, type TFunc } from './i18n';

const I18nContext = createContext<TFunc>(getT('bg'));

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = getT(locale);
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

export function useT(): TFunc {
  return useContext(I18nContext);
}
