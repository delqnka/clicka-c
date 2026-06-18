import './suhaib.css';
import { SuhaibClient } from './SuhaibClient';
import { getPublicSalonPageData } from '@/lib/public-salon';

const SLUG = process.env.SUHAIB_SALON_SLUG ?? 'salon-suhaib';

export const metadata = {
  title: 'Салон Сухайб · Премиум бръснарски салон в София',
  description:
    'Салон Сухайб е премиум бръснарски салон в центъра на София. Мъжки и дамски прически, оформяне на брада, авторски стайлинг от майстор Сухайб.',
};

export default async function SuhaibPage() {
  const pageData = await getPublicSalonPageData({ slug: SLUG });
  const salon = (pageData?.salon ?? {}) as Record<string, unknown>;

  return <SuhaibClient slug={SLUG} salon={salon} />;
}
