import type { Metadata } from 'next';
import MarketingHomePage from '@/app/components/HomePage';
import { clickaMarketingSite } from '@/lib/clicka-marketing-site';
import { getMarketingActivity } from '@/lib/marketing-activity';
import { MetaPixelViewContent } from '@/components/meta-pixel-view-content';

export const revalidate = 60;

export const metadata: Metadata = {
  title: clickaMarketingSite.title,
  description: clickaMarketingSite.description,
};

export default async function MarketingHomeRoute() {
  const activity = await getMarketingActivity();
  return <><MetaPixelViewContent /><MarketingHomePage activity={activity} /></>;
}
