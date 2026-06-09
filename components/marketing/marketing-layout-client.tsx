'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
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
  const [secondaryReady, setSecondaryReady] = useState(false);
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(() => { if (!cancelled) setSecondaryReady(true); }, { timeout: 3000 });
      return () => { cancelled = true; cancelIdleCallback(id); };
    }
    const t = setTimeout(() => { if (!cancelled) setSecondaryReady(true); }, 2000);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  // Show chat widget only after scrolling past the hero
  useEffect(() => {
    if (pathname !== '/marketing-home' && pathname !== '/') { setPastHero(true); return; }
    setPastHero(false);
    const onScroll = () => { if (window.scrollY > window.innerHeight * 0.6) setPastHero(true); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  return (
    <>
      {children}
      {showFooter && <SiteFooter />}
      {secondaryReady && pastHero && <ChatWidget mobileBottomOffset={showFooter ? 110 : 0} />}
      {secondaryReady && <CookieConsentBanner description="Използваме бисквитки за анализ и маркетинг, за да подобрим сайта." />}
    </>
  );
}
