'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { SiteFooter } from '@/components/marketing/site-footer';

const ChatWidget = dynamic(
  () => import('@/components/marketing/chat-widget').then((m) => ({ default: m.ChatWidget })),
  { ssr: false },
);

const CookieConsentBanner = dynamic(
  () => import('@/components/analytics/CookieConsentBanner').then((m) => ({ default: m.CookieConsentBanner })),
  { ssr: false },
);

const NO_FOOTER_PATHS = ['/create', '/success'];

export function MarketingLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showFooter = !NO_FOOTER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <>
      {children}
      {showFooter && <SiteFooter />}
      <ChatWidget mobileBottomOffset={showFooter ? 110 : 0} />
      <CookieConsentBanner />
    </>
  );
}
