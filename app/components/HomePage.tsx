import dynamic from 'next/dynamic';
import { ClickaHero } from '@/components/ui/clicka-hero';
import { MarketingHomeHeader } from '@/components/marketing/marketing-home-header';
import { MarketingHomeSectionNav } from '@/components/marketing/marketing-home-section-nav';
import type { MarketingActivity } from '@/lib/marketing-activity-shared';

const MarketingHomeBelowFold = dynamic(
  () => import('@/components/marketing/marketing-home-below-fold').then((m) => ({ default: m.MarketingHomeBelowFold })),
);

type MarketingHomePageProps = {
  activity?: MarketingActivity;
};

export default function HomePage({ activity }: MarketingHomePageProps = {}) {
  return (
    <div className="hp">
      <MarketingHomeHeader />
      <MarketingHomeSectionNav />
      <main id="main-content">
        <ClickaHero activity={activity} />
        <MarketingHomeBelowFold />
      </main>
    </div>
  );
}
