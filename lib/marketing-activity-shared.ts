/** Client-safe constants and copy — no DB imports. */

/** Временни showcase стойности за маркетинг (не от базата). */
export const MARKETING_ACTIVITY_MOCK = {
  startedThisMonth: 27,
  settingUpNow: 4,
  activeSalons: 12,
  salonCities: ['София', 'Пловдив', 'Варна'],
} as const satisfies MarketingActivity;

/** @deprecated използвай MARKETING_ACTIVITY_MOCK */
export const MARKETING_ACTIVITY_FLOOR = {
  startedThisMonth: MARKETING_ACTIVITY_MOCK.startedThisMonth,
  settingUpNow: MARKETING_ACTIVITY_MOCK.settingUpNow,
  activeSalons: MARKETING_ACTIVITY_MOCK.activeSalons,
} as const;

export const MARKETING_SALON_CITIES_FLOOR = MARKETING_ACTIVITY_MOCK.salonCities;

export const HERO_PRICE_PILL = '0% комисионна · от 0,82 €/ден';

export const HERO_CHIPS = [
  'Старт за 15 мин',
  'Резервации',
  'Известия в Telegram',
  'Твой домейн',
  '100/100 SEO',
] as const;

export type MarketingActivity = {
  startedThisMonth: number;
  settingUpNow: number;
  activeSalons: number;
  salonCities: string[];
};

export function getMarketingActivityMock(): MarketingActivity {
  return {
    startedThisMonth: MARKETING_ACTIVITY_MOCK.startedThisMonth,
    settingUpNow: MARKETING_ACTIVITY_MOCK.settingUpNow,
    activeSalons: MARKETING_ACTIVITY_MOCK.activeSalons,
    salonCities: [...MARKETING_ACTIVITY_MOCK.salonCities],
  };
}

export function formatSettingUpNowLine(settingUpNow: number): string {
  return `${settingUpNow} салона настройват сайт сега`;
}

/** @deprecated use formatSettingUpNowLine / HERO_PRICE_PILL */
export function formatHeroTrustPill(activeSalons: number): string {
  return `${activeSalons}+ салона вече са независими`;
}

export function formatSalonCitiesTrustLine(cities: string[]): string {
  const list =
    cities.length > 0 ? cities : [...MARKETING_ACTIVITY_MOCK.salonCities];

  if (list.length === 1) {
    return `Салони в ${list[0]}`;
  }
  if (list.length === 2) {
    return `Салони в ${list[0]} и ${list[1]}`;
  }
  if (list.length === 3) {
    return `Салони в ${list[0]}, ${list[1]} и ${list[2]}`;
  }
  return `Салони в ${list[0]}, ${list[1]} и още`;
}
