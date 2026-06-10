'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import Image from 'next/image';
import { DeferredMount } from '@/components/marketing/deferred-mount';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { formatDualEurText } from '@/lib/salon-currency';

const MarketingAudienceSection = dynamic(
  () => import('@/components/marketing/marketing-home-sections').then((m) => ({ default: m.MarketingAudienceSection })),
);
const OwnPlatformSection = dynamic(
  () => import('@/components/marketing/marketing-home-sections').then((m) => ({ default: m.OwnPlatformSection })),
);
const PriceListImportSection = dynamic(
  () => import('@/components/marketing/marketing-home-sections').then((m) => ({ default: m.PriceListImportSection })),
);
const TelegramManagementSection = dynamic(
  () => import('@/components/marketing/marketing-home-sections').then((m) => ({ default: m.TelegramManagementSection })),
);
const TelegramChatSection = dynamic(
  () => import('@/components/marketing/marketing-home-sections').then((m) => ({ default: m.TelegramChatSection })),
);
const MarketingFeaturesSection = dynamic(
  () => import('@/components/marketing/marketing-home-sections').then((m) => ({ default: m.MarketingFeaturesSection })),
);
const MarketingComparisonSection = dynamic(
  () => import('@/components/marketing/marketing-home-sections').then((m) => ({ default: m.MarketingComparisonSection })),
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
      <MarketingAudienceSection />
      <OwnPlatformSection />

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

      <MarketingFeaturesSection />
      <MarketingComparisonSection />

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
              style={{ fontSize: 'clamp(22px,4.5vw,38px)', marginBottom: 12, backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}
            >
              Ето какво виждат твоите клиенти
            </h2>
            <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: 'var(--muted-foreground)', maxWidth: 520, margin: '0 auto' }}>
              Професионален сайт, който работи за теб <span style={{ backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>24/7 и приема резервации</span>, дори когато спиш!
            </p>
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
            Приемай депозити онлайн
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.65, marginBottom: 28, maxWidth: 520 }}>
            Клиентите могат да платят депозит още при записването. Парите постъпват директно в твоя Stripe акаунт.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Намалява неявяванията',
              'Приемай плащания с карта',
              'Парите отиват директно при теб',
              'Без комисионна от Clicka',
            ].map((f, i) => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <defs><linearGradient id={`dep${i}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e11d48" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
                  <path d="M20 6L9 17l-5-5" stroke={`url(#dep${i})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: 'clamp(14px,1.8vw,16px)', fontWeight: 600, color: '#0f0f0f' }}>{f}</span>
              </li>
            ))}
          </ul>
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
            Събирай повече Google ревюта
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.65, marginBottom: 32 }}>
            След всяка завършена резервация клиентът получава автоматична покана да остави ревю.
            Защото Google ревютата имат реална стойност. А ревютата в твоя сайт — почти нямат.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 36 }}>
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

          <div style={{ background: '#0f0f0f', borderRadius: 16, padding: '24px 20px', marginBottom: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#db2777', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Има още по-важна причина
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
              Google ревютата носят клиенти
            </p>
            <p style={{ fontSize: 13, color: '#aaa', marginBottom: 14, lineHeight: 1.5 }}>
              Когато някой търси:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {['фризьор варна', 'маникюр лозенец', 'козметик бургас'].map((q) => (
                <span key={q} style={{ fontSize: 13, color: '#e879f9', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 6, display: 'inline-block', width: 'fit-content' }}>{q}</span>
              ))}
            </div>
            <p style={{ fontSize: 13, color: '#aaa', marginBottom: 10, lineHeight: 1.5 }}>Google показва:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {['⭐ рейтинг', '💬 брой ревюта', '📍 позиция в картата'].map((item) => (
                <p key={item} style={{ fontSize: 13, color: '#e2e8f0', margin: 0 }}>{item}</p>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', backgroundImage: 'linear-gradient(135deg,#e11d48,#e879f9,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.8 }}>
                Повече ревюта<br />= Повече доверие<br />= Повече клиенти
              </p>
            </div>
          </div>

          <div style={{ borderRadius: 16, border: '1.5px solid #eee', padding: '24px 20px', background: '#fff' }}>
            <h3 style={{ fontSize: 'clamp(16px,2.5vw,20px)', fontWeight: 700, marginBottom: 12, lineHeight: 1.3, backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Google ревютата работят за теб
            </h3>
            {[
              'След всяка завършена резервация, клиентът получава покана да остави ревю в Google профила ти.',
              'Новите ревюта автоматично се показват и на сайта ти, за да изграждат доверие и да помагат на повече хора да изберат твоя бизнес!',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: i === 0 ? 10 : 0 }}>
                <span style={{ flexShrink: 0, marginTop: 7, width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #e11d48, #a855f7)', display: 'inline-block' }} />
                <p style={{ fontSize: 'clamp(13px,1.6vw,15px)', color: '#555', lineHeight: 1.65, margin: 0 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-label="Готов за реклами"
        style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 50%, #fff 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
            Маркетинг интеграции
          </p>
          <h2 className="hp-heading" style={{ fontSize: 'clamp(24px,4.5vw,40px)', marginBottom: 14, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>
            Готов за Facebook и Google реклами
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.65, marginBottom: 28, maxWidth: 520 }}>
            Интегрирай Meta Pixel, Google Analytics и Microsoft Clarity само с няколко клика и виж как рекламите ти се превръщат в реални резервации.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Виж колко хора посещават сайта ти',
              'Виж откъде идват клиентите ти',
              'Виж кои реклами носят резервации',
              'Виж стойността на всяка резервация',
              'Данните са твои, не на платформа',
            ].map((f, i) => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <defs><linearGradient id={`ads${i}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e11d48" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
                  <path d="M20 6L9 17l-5-5" stroke={`url(#ads${i})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: 'clamp(14px,1.8vw,16px)', fontWeight: 600, color: '#0f0f0f' }}>{f}</span>
              </li>
            ))}
          </ul>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f0f0f', marginBottom: 12 }}>Включени интеграции</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { name: 'Meta Pixel', color: '#1877F2' },
              { name: 'Google Analytics 4', color: '#e37400' },
              { name: 'Microsoft Clarity', color: '#0078D4' },
            ].map(({ name, color }) => (
              <span key={name} style={{ fontSize: 14, fontWeight: 400, color: '#0f0f0f', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{ background: 'linear-gradient(180deg, #fff 0%, #fff 100%)', padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)', position: 'relative' }}
        aria-labelledby="seo-h"
      >
        <div className="hp-seo-grid">
          <div>
            <h2 id="seo-h" className="hp-heading bg-clip-text" style={{ fontSize: 'clamp(26px,3.8vw,44px)', marginBottom: 16, backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', color: 'transparent' }}>
              Откриваем в Google
            </h2>
            <p style={{ fontSize: 'clamp(15px,1.55vw,17px)', color: 'var(--secondary-foreground)', lineHeight: 1.74, margin: 0 }}>
              Всеки сайт е технически оптимизиран за Google, за да помага на нови клиенти да те намират по-лесно.
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
