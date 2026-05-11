import type { Metadata } from 'next';
import { ClickaSleekLanding } from '@/components/marketing/clicka-sleek-landing';
import { clickaMarketingSite } from '@/lib/clicka-marketing-site';

export const metadata: Metadata = {
  title: clickaMarketingSite.title,
  description: clickaMarketingSite.description,
};

export default function HomePage() {
  return <ClickaSleekLanding />;
}
