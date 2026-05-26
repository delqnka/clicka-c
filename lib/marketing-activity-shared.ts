/** Client-safe constants and copy — no DB imports. */
export const MARKETING_ACTIVITY_FLOOR = {
  startedThisMonth: 27,
  settingUpNow: 4,
  activeSalons: 12,
} as const;

export type MarketingActivity = {
  startedThisMonth: number;
  settingUpNow: number;
  activeSalons: number;
};

export function formatHeroTrustPill(activeSalons: number): string {
  return `${activeSalons}+ салона вече са независими`;
}
