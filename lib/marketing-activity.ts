import {
  getMarketingActivityMock,
  MARKETING_ACTIVITY_MOCK,
  type MarketingActivity,
} from '@/lib/marketing-activity-shared';

export {
  getMarketingActivityMock,
  MARKETING_ACTIVITY_FLOOR,
  MARKETING_ACTIVITY_MOCK,
  type MarketingActivity,
} from '@/lib/marketing-activity-shared';
export {
  formatHeroTrustPill,
  formatSalonCitiesTrustLine,
  formatSettingUpNowLine,
  HERO_CHIPS,
  HERO_PRICE_PILL,
} from '@/lib/marketing-activity-shared';

/** Засега връща фиксирани showcase стойности. Реални DB заявки — по-късно. */
export async function getMarketingActivity(): Promise<MarketingActivity> {
  return getMarketingActivityMock();
}
