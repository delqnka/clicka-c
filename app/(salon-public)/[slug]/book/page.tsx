import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicSalonPageData } from '@/lib/public-salon';
import { SalonEmbedBookingView } from '@/components/salon/SalonEmbedBookingView';

export const revalidate = 60;

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pageData = await getPublicSalonPageData({ slug: params.slug });
  if (!pageData) return {};
  const salonName = String((pageData.salon as Record<string, unknown>).name ?? '');
  return {
    title: `Резервация — ${salonName}`,
    robots: { index: false },
  };
}

export default async function SalonBookPage({ params }: Props) {
  const pageData = await getPublicSalonPageData({ slug: params.slug });
  if (!pageData) notFound();

  return (
    <>
      <style>{`
        html, body {
          margin: 0;
          padding: 0;
          background: transparent;
          overflow: hidden;
        }
      `}</style>
      <SalonEmbedBookingView pageData={pageData} />
    </>
  );
}
