'use client';

import { ActivityBanner } from '@/components/marketing/activity-banner';
import { ContactSection } from '@/components/marketing/contact-section';
import { HeroSection } from '@/components/marketing/hero-section';
import { ServicesSection } from '@/components/marketing/services-section';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import { SmoothScroll } from '@/components/marketing/smooth-scroll';
import { PricingSection } from '@/components/marketing/pricing-section';
import { WorkSection } from '@/components/marketing/work-section';

export function ClickaSleekLanding() {
  return (
    <SmoothScroll>
      <div className="sleek-marketing relative z-10 min-h-dvh bg-[#0a0a0a] text-foreground antialiased">
        <SiteHeader />
        <main>
          <HeroSection />
          <ActivityBanner />
          <ServicesSection />
          <PricingSection />
          <WorkSection />
          <ContactSection />
        </main>
        <SiteFooter />
      </div>
    </SmoothScroll>
  );
}
