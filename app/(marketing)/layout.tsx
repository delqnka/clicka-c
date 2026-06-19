import './marketing-tailwind.css';
import './marketing.css';
import { notFound } from 'next/navigation';
import { MarketingLayoutClient } from '@/components/marketing/marketing-layout-client';
import { isEngineOnlyMode } from '@/lib/engine-mode';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  if (isEngineOnlyMode()) notFound();
  return <MarketingLayoutClient>{children}</MarketingLayoutClient>;
}
