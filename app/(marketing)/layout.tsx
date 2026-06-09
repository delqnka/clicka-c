import './marketing-tailwind.css';
import './marketing.css';
import { MarketingLayoutClient } from '@/components/marketing/marketing-layout-client';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <MarketingLayoutClient>{children}</MarketingLayoutClient>;
}
