'use client';

import './marketing-tailwind.css';
import { usePathname } from 'next/navigation';
import { SiteFooter } from '@/components/marketing/site-footer';
import { ChatWidget } from '@/components/marketing/chat-widget';

const NO_FOOTER_PATHS = ['/create', '/success'];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showFooter = !NO_FOOTER_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  return (
    <>
      {children}
      {showFooter && <SiteFooter />}
      <ChatWidget />
    </>
  );
}
