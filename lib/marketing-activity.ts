import { sql } from '@/lib/db';

/** Минимални стойности за показ (реалните от БД могат да са по-ниски в dev). */
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

export async function getMarketingActivity(): Promise<MarketingActivity> {
  const rows = await sql`
    SELECT
      COALESCE(
        COUNT(*) FILTER (
          WHERE is_active = true
            AND created_at >= date_trunc('month', now())
        ),
        0
      )::int AS started_this_month,
      COALESCE(
        COUNT(*) FILTER (
          WHERE site_status = 'pending'
        ),
        0
      )::int AS setting_up_now,
      COALESCE(
        COUNT(*) FILTER (
          WHERE is_active = true
            AND site_status = 'active'
        ),
        0
      )::int AS active_salons
    FROM salons
  `;

  const row = (rows[0] ?? {}) as Record<string, unknown>;

  return {
    startedThisMonth: Math.max(
      MARKETING_ACTIVITY_FLOOR.startedThisMonth,
      Number(row.started_this_month ?? 0),
    ),
    settingUpNow: Math.max(
      MARKETING_ACTIVITY_FLOOR.settingUpNow,
      Number(row.setting_up_now ?? 0),
    ),
    activeSalons: Math.max(
      MARKETING_ACTIVITY_FLOOR.activeSalons,
      Number(row.active_salons ?? 0),
    ),
  };
}

export function formatHeroTrustPill(activeSalons: number): string {
  return `${activeSalons}+ салона вече са независими`;
}
