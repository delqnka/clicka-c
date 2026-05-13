import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { ClickaSleekLanding } from '@/components/marketing/clicka-sleek-landing';
import { clickaMarketingSite } from '@/lib/clicka-marketing-site';
import SalonPublicParity from '@/app/components/SalonPublicParity';
import { extractHostname, isPlatformApexHost } from '@/lib/domain-routing';
import { getPublicSalonPageData } from '@/lib/public-salon';

export const metadata: Metadata = {
  title: clickaMarketingSite.title,
  description: clickaMarketingSite.description,
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const host = headers().get('host');
  const hostname = extractHostname(host);
  if (isPlatformApexHost(hostname)) {
    return <ClickaSleekLanding />;
  }

  const pageData = await getPublicSalonPageData({ host });

  if (pageData) {
    return (
      <SalonPublicParity
        salonSlug={pageData.salonSlug}
        salon={pageData.salon}
        offers={pageData.offers as never}
        reviews={pageData.reviews as never}
        googleReviews={pageData.googleReviews}
        staticMapUrl={pageData.staticMapUrl}
      />
    );
  }

  return <ClickaSleekLanding />;
}
