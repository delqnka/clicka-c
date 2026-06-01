import './marketing-tailwind.css';
import { SiteFooter } from '@/components/marketing/site-footer';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}
