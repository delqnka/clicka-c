'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import Image from 'next/image';
import { DeferredMount } from '@/components/marketing/deferred-mount';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { formatDualEurText } from '@/lib/salon-currency';

const PriceListImportSection = dynamic(
  () => import('@/components/marketing/marketing-home-sections').then((m) => ({ default: m.PriceListImportSection })),
);
const TelegramManagementSection = dynamic(
  () => import('@/components/marketing/marketing-home-sections').then((m) => ({ default: m.TelegramManagementSection })),
);
const TelegramChatSection = dynamic(
  () => import('@/components/marketing/marketing-home-sections').then((m) => ({ default: m.TelegramChatSection })),
);
const MarketingFounderSection = dynamic(
  () => import('@/components/marketing/marketing-home-sections').then((m) => ({ default: m.MarketingFounderSection })),
);
const MarketingFaqSection = dynamic(
  () => import('@/components/marketing/marketing-faq-section').then((m) => ({ default: m.MarketingFaqSection })),
);
const MarketingHomePricingSection = dynamic(
  () => import('@/components/marketing/marketing-home-pricing').then((m) => ({ default: m.MarketingHomePricingSection })),
);
const IPhoneMockup = dynamic(
  () => import('@/components/ui/iphone-mockup').then((m) => ({ default: m.IPhoneMockup })),
  { ssr: false },
);

export function MarketingHomeBelowFold() {
  useEffect(() => {
    let obs: IntersectionObserver | null = null;
    let cancelled = false;

    const setup = () => {
      if (cancelled) return;
      const els = document.querySelectorAll('[data-reveal]');
      obs = new IntersectionObserver(
        (entries) => entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity = '1';
            (e.target as HTMLElement).style.transform = 'translateY(0)';
            obs?.unobserve(e.target);
          }
        }),
        { threshold: 0.06, rootMargin: '0px 0px -40px 0px' },
      );
      els.forEach((el) => obs!.observe(el));
    };

    let cancelSchedule: (() => void) | undefined;
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(setup, { timeout: 2500 });
      cancelSchedule = () => window.cancelIdleCallback(id);
    } else {
      const id = window.setTimeout(setup, 400);
      cancelSchedule = () => window.clearTimeout(id);
    }

    return () => {
      cancelled = true;
      cancelSchedule?.();
      obs?.disconnect();
    };
  }, []);

  return (
    <>
      {/* ── Losing clients pain ── */}
      <section style={{ background: '#fff', padding: 'clamp(64px,10vw,120px) clamp(20px,5vw,60px)', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <p style={{ fontSize: 'clamp(18px,4vw,26px)', color: '#0f0f0f', lineHeight: 1.4, marginBottom: 'clamp(12px,2vw,20px)' }}>
            Клиентката търси фризьор в Google в 23:00.
          </p>
          <p style={{ fontSize: 'clamp(18px,4vw,26px)', color: '#0f0f0f', lineHeight: 1.4, marginBottom: 'clamp(12px,2vw,20px)' }}>
            Ти нямаш сайт.
          </p>
          <p style={{ fontSize: 'clamp(18px,4vw,26px)', fontWeight: 700, lineHeight: 1.4, margin: 0, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Тя се записа при конкурентката ти.
          </p>
        </div>
      </section>

      <div data-home-section="how-it-works" id="how-it-works">
        <DeferredMount minHeight={240}>
          <PriceListImportSection />
        </DeferredMount>
        <DeferredMount minHeight={320}>
          <TelegramManagementSection />
        </DeferredMount>
        <DeferredMount minHeight={360}>
          <TelegramChatSection />
        </DeferredMount>
      </div>

      <section
        aria-label="Клиентски сайт"
        style={{
          background: 'linear-gradient(180deg, #fff 0%, #fff1f2 50%, #fff 100%)',
          padding: 'clamp(40px,8vw,80px) clamp(20px,5vw,60px)',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
          <div style={{ textAlign: 'center' }}>
            <h2
              className="hp-heading"
              style={{ fontSize: 'clamp(22px,4.5vw,38px)', marginBottom: 0, backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}
            >
              Ето го твоят сайт.
            </h2>
          </div>

          <div style={{ width: '100%', maxWidth: 'min(52vw, 200px)' }}>
            <IPhoneMockup
              poster="/vid1-poster.webp"
              mp4Src="/video-clicka.mov"
              playbackRate={2}
              showPlayButton
              blurQuickType
              blurTimeRange={[44, 57]}
            />
          </div>
        </div>
      </section>

      <section
        style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 50%, #fff 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
        aria-label="Онлайн плащания"
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#635BFF', letterSpacing: '-0.03em', fontFamily: 'system-ui, sans-serif' }}>stripe</span>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#635BFF', margin: 0 }}>
              интеграция
            </p>
          </div>
          <h2 className="hp-heading" style={{ fontSize: 'clamp(24px,4.5vw,40px)', marginBottom: 14, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>
            Клиентите, платили депозит, идват.
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.65, marginBottom: 0, maxWidth: 520 }}>
            Те плащат при резервацията. Парите са в твоя Stripe акаунт. Без комисионна от нас.
          </p>
        </div>
      </section>

      <section
        style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 50%, #fff 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
        aria-label="Google ревюта"
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
            Автоматично след резервация
          </p>
          <h2 className="hp-heading" style={{ fontSize: 'clamp(24px,4.5vw,40px)', marginBottom: 16, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>
            Събирай Google ревюта, не сайт ревюта.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
            <div style={{ borderRadius: 16, border: '1.5px solid #eee', padding: '20px 16px', background: '#fafafa' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Вариант 1</p>
              <p style={{ fontSize: 14, color: '#f59e0b', marginBottom: 6 }}>⭐⭐⭐⭐⭐</p>
              <p style={{ fontSize: 13, color: '#555', fontStyle: 'italic', marginBottom: 10, lineHeight: 1.4 }}>&quot;Много съм доволна&quot;</p>
              <p style={{ fontSize: 11, color: '#aaa', marginBottom: 16 }}>на salonani.clicka.bg</p>
              <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4 }}>Клиентът мисли:</p>
                <p style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic', lineHeight: 1.4 }}>&quot;Да бе, те сами са си ги сложили.&quot;</p>
              </div>
            </div>

            <div style={{
              borderRadius: 16,
              padding: '20px 16px',
              background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg,#e11d48,#a855f7) border-box',
              border: '2px solid transparent',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#db2777', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Вариант 2</p>
              <p style={{ fontSize: 14, color: '#f59e0b', marginBottom: 4 }}>⭐⭐⭐⭐⭐</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f0f0f', marginBottom: 10 }}>4.9 <span style={{ fontWeight: 400, color: '#888' }}>(187 ревюта)</span></p>
              <p style={{ fontSize: 11, color: '#888', marginBottom: 16 }}>в Google Business</p>
              <div style={{ borderTop: '1px solid #f3e8ff', paddingTop: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4 }}>Клиентът мисли:</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#0f0f0f', fontStyle: 'italic', lineHeight: 1.4 }}>&quot;ОК, това е истинско.&quot;</p>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.65, margin: 0 }}>
            След всяка завършена резервация клиентът получава покана да остави ревю в Google.
          </p>
        </div>
      </section>


      <section
        style={{ background: 'linear-gradient(180deg, #fff 0%, #fff 100%)', padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)', position: 'relative' }}
        aria-labelledby="seo-h"
      >
        <div className="hp-seo-grid">
          <div>
            <h2 id="seo-h" className="hp-heading bg-clip-text" style={{ fontSize: 'clamp(26px,3.8vw,44px)', marginBottom: 16, backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', color: 'transparent' }}>
              Нови клиенти от Google. По-лесно за теб.
            </h2>
            <p style={{ fontSize: 'clamp(15px,1.55vw,17px)', color: 'var(--secondary-foreground)', lineHeight: 1.74, margin: 0 }}>
              100/100 SEO резултат на всеки сайт.
            </p>
          </div>
          <figure className="hp-seo-visual" style={{ maxWidth: 160, margin: '0 auto' }}>
            <Image
              src="/images/lighthouse-seo-100.webp"
              alt="Google Lighthouse SEO резултат 100 от 100"
              width={576}
              height={1024}
              sizes="(max-width: 900px) 220px, 220px"
              style={{ width: '100%', height: 'auto', display: 'block' }}
              loading="lazy"
            />
          </figure>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to top, #ffffff, transparent)', pointerEvents: 'none' }} />
      </section>

      <MarketingFounderSection />

      {/* ── How it works steps ── */}
      <section style={{ background: '#fff', padding: 'clamp(64px,10vw,96px) clamp(20px,5vw,60px)', textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px,5vw,42px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 'clamp(32px,5vw,48px)', backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Как работи?
          </h2>
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0, textAlign: 'left' }}>
            {[
              { n: '1', text: 'Избираш план', green: false },
              { n: '✓', text: 'Сайтът ти е готов веднага', green: true },
              { n: '3', text: 'Качваш снимка на услугите си', green: false },
              { n: '4', text: 'Свързваш Telegram за известия', green: false },
              { n: '✓', text: 'Вече приемаш резервации', green: true },
            ].map((s, i, arr) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0' }}>
                  {s.green ? (
                    <span style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#16a34a', fontWeight: 700, fontSize: 16, color: '#fff', boxShadow: '0 4px 16px rgba(22,163,74,0.35)' }}>{s.n}</span>
                  ) : (
                    <span style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(219,39,119,0.25)' }}>
                      <span style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.n}</span>
                      </span>
                    </span>
                  )}
                  <span style={{ fontSize: 'clamp(15px,2vw,17px)', fontWeight: 500, color: s.green ? '#15803d' : '#1a1a1a' }}>{s.text}</span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ paddingLeft: 17 }}>
                    <div style={{ width: 2, height: 24, background: 'linear-gradient(to bottom,#e11d48,#a855f7)', borderRadius: 2, opacity: 0.35 }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingHomePricingSection />
      <MarketingFaqSection />

      <section
        id="cta"
        data-home-section="cta"
        style={{ background: 'linear-gradient(to bottom, #0a0a0a 0%, #0a0a0a 30%, #5a0a20 55%, #8b1040 72%, #c0185a 85%, #e11d60 95%, #fb7185 100%)', padding: 'clamp(80px,12vw,140px) clamp(20px,5vw,60px) 0', textAlign: 'center', overflow: 'hidden', position: 'relative' }}
        aria-labelledby="cta-h"
      >
        <div data-reveal style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 id="cta-h" className="hp-heading bg-clip-text" style={{ fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.1, marginBottom: 20, backgroundImage: 'linear-gradient(135deg, #fb7185, #e879f9, #c084fc)', color: 'transparent' }}>
            Следващата резервация може да е след 5 минути.
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.6vw,18px)', fontWeight: 400, color: 'color-mix(in srgb, var(--hp-cta-fg) 72%, transparent)', marginBottom: 44, lineHeight: 1.67 }}>
            Попълни данните си, избери план и сайтът ти е онлайн веднага.
          </p>
          <ButtonColorful
            href="/create"
            label="Създай своя сайт"
            className="h-14 rounded-full px-12 text-[17px] font-bold"
          />
          <p style={{ marginTop: 20, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            от {formatDualEurText('0.82')} на ден. 0% комисионна върху резервациите ти. Твоя бранд.
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
          <div style={{
            width: '75%',
            maxWidth: 260,
            border: '10px solid #1a1a1a',
            borderBottom: 'none',
            borderRadius: '44px 44px 0 0',
            overflow: 'hidden',
            boxShadow: '0 0 0 2px #333',
          }}>
            <div style={{ background: '#000', height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 90, height: 22, background: '#1a1a1a', borderRadius: 20 }} />
            </div>
            <Image
              src="/marketing/IMG_1832.webp"
              alt="Clicka в действие"
              width={520}
              height={1120}
              sizes="(max-width: 640px) 75vw, 260px"
              quality={78}
              loading="lazy"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
