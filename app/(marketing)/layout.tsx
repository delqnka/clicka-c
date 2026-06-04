import './marketing-tailwind.css';
import { SiteFooter } from '@/components/marketing/site-footer';
import { ChatWidget } from '@/components/marketing/chat-widget';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter />
      <ChatWidget />
    </>
  );
}
