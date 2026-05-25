import type { Metadata } from 'next';
import { headers } from 'next/headers';
import MarketingHomePage from '@/app/components/HomePage';
import SalonPublicParity from '@/app/components/SalonPublicParity';
import { extractHostname, isPlatformApexHost, getPrimaryPublicUrl } from '@/lib/domain-routing';
import { getPublicSalonPageData } from '@/lib/public-salon';
import { clickaMarketingSite } from '@/lib/clicka-marketing-site';
import { buildSalonJsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const host = headers().get('host');
  const hostname = extractHostname(host);

  if (isPlatformApexHost(hostname)) {
    return {
      title: clickaMarketingSite.title,
      description: clickaMarketingSite.description,
    };
  }

  const pageData = await getPublicSalonPageData({ host });
  if (!pageData) {
    return { title: 'Салонът не е намерен' };
  }

  const s = pageData.salon as Record<string, unknown>;
  const name = String(s.name ?? '');
  const city = String(s.city ?? '');
  const category = String(s.category ?? '');
  const about = String(s.about ?? '').slice(0, 155);
  const coverImage = String(s.cover_image_url ?? '');
  const slug = pageData.salonSlug;

  const title = city
    ? `${name} — ${category || 'Салон'} в ${city}`
    : `${name} — ${category || 'Салон'}`;

  const description = about
    || `${name} — онлайн резервации, услуги и работно време. Запази час лесно и бързо.`;

  const canonicalUrl = getPrimaryPublicUrl({
    slug,
    customDomain: String(s.custom_domain ?? ''),
    domainStatus: String(s.domain_status ?? ''),
  });

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: name,
      type: 'website',
      locale: 'bg_BG',
      ...(coverImage ? { images: [{ url: coverImage, width: 1200, height: 630, alt: name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(coverImage ? { images: [coverImage] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

export default async function HomePage() {
  const host = headers().get('host');
  const hostname = extractHostname(host);
  if (isPlatformApexHost(hostname)) {
    return <MarketingHomePage />;
  }

  const pageData = await getPublicSalonPageData({ host });

  if (pageData) {
    const jsonLd = buildSalonJsonLd(pageData.salon as Record<string, unknown>, pageData.salonSlug);
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SalonPublicParity
          salonSlug={pageData.salonSlug}
          salon={pageData.salon}
          offers={pageData.offers as never}
          reviews={pageData.reviews as never}
          googleReviews={pageData.googleReviews}
          staticMapUrl={pageData.staticMapUrl}
        />
      </>
    );
  }

  return <MarketingHomePage />;
}
