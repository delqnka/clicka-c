import type { Metadata } from 'next';
import MarketingHomePage from '@/app/components/HomePage';
import { clickaMarketingSite } from '@/lib/clicka-marketing-site';
import { getMarketingActivity } from '@/lib/marketing-activity';

export const revalidate = 60;

export const metadata: Metadata = {
  title: clickaMarketingSite.title,
  description: clickaMarketingSite.description,
};

export default async function MarketingHomeRoute() {
  const activity = await getMarketingActivity();
  return <MarketingHomePage activity={activity} />;
}
