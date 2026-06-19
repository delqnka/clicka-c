import { notFound } from 'next/navigation';
import { getPublicSalonPageData } from '@/lib/public-salon';
import { isEngineOnlyMode } from '@/lib/engine-mode';
import { BookingTestClient } from './BookingTestClient';

type Props = {
  searchParams: { slug?: string };
};

/**
 * Test page — validates that BookingWidget works standalone,
 * without SalonPublicParity, without iframe, without Clicka branding.
 *
 * Usage: /test-booking?slug=your-salon-slug
 */
export default async function TestBookingPage({ searchParams }: Props) {
  if (isEngineOnlyMode()) notFound();

  const slug = (searchParams.slug ?? '').trim();

  if (!slug) {
    return (
      <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: 480 }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>BookingWidget test</h1>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Добави <code>?slug=твоя-слъг</code> към URL-а.
        </p>
        <p style={{ color: '#999', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Пример: <code>/test-booking?slug=hair-and-art</code>
        </p>
      </div>
    );
  }

  const pageData = await getPublicSalonPageData({ slug });
  if (!pageData) notFound();

  return (
    <BookingTestClient
      slug={pageData.salonSlug}
      salon={pageData.salon as Record<string, unknown>}
    />
  );
}
