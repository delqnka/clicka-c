'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const FEATURES = [
  'Професионален сайт',
  'Резервационна система',
  'Хостинг',
  'Email напомняния към клиентите',
  'Неограничени резервации',
  'Мобилна версия',
  'Свързване на личен домейн с 1 бутон',
];

const PLANS = [
  {
    id: 'solo',
    name: 'SOLO',
    daily: '0.82',
    yearly: '299',
    desc: '1 специалист',
    popular: false,
  },
  {
    id: 'ekip',
    name: 'ЕКИП',
    daily: '1,09',
    yearly: '399',
    desc: 'до 3 специалисти',
    popular: true,
  },
  {
    id: 'studio',
    name: 'СТУДИО',
    daily: '1.64',
    yearly: '599',
    desc: 'неограничени специалисти',
    popular: false,
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Избери дизайн',
    desc: '5 професионални шаблона за салони',
  },
  {
    n: '02',
    title: 'Качи информацията си',
    desc: 'Снимка на ценоразписа, галерия, описание. Всичко останало е автоматично.',
  },
  {
    n: '03',
    title: 'Получи своя сайт',
    desc: 'За 15 минути имаш готов сайт с резервационна система',
  },
];

export default function HomePage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-white text-black overflow-x-hidden">

      {/* ══════════════════════════════════════════
          NAV
      ══════════════════════════════════════════ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/75 backdrop-blur-2xl border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Image
            src="/logo.png"
            alt="Clicka.bg"
            width={140}
            height={36}
            className="h-8 w-auto"
            priority
          />
          <Link
            href="/create"
            className="bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-gray-900 transition-colors shadow-sm"
          >
            Започни сега
          </Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-black/5 via-black/0 to-black/5 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.06),rgba(255,255,255,0)_55%)]" />
        </div>
        <h1
          data-animate
          className="relative text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight leading-[1.03] mb-8 max-w-4xl"
        >
          Твоят личен<br />
          24/7 рецепционист.
        </h1>

        <p
          data-animate
          style={{ transitionDelay: '120ms' }}
          className="relative text-lg sm:text-xl md:text-2xl text-black/55 max-w-2xl leading-relaxed mb-10"
        >
          Готов сайт с резервационна система за твоя салон.{' '}
          Клиентите са си само твои. Без комисионна!
        </p>

        <div
          data-animate
          style={{ transitionDelay: '220ms' }}
          className="relative flex flex-wrap items-center justify-center gap-4 mb-6"
        >
          <Link
            href="/create"
            className="bg-black text-white px-8 py-4 rounded-full text-base font-semibold hover:bg-gray-900 active:scale-95 transition-all shadow-sm"
          >
            Започни сега
          </Link>
          <a
            href="https://demo.clicka.bg"
            target="_blank"
            rel="noopener"
            className="border border-black/20 text-black px-8 py-4 rounded-full text-base font-semibold hover:bg-black/[0.03] active:scale-95 transition-all"
          >
            Виж пример
          </a>
        </div>

        <p
          data-animate
          style={{ transitionDelay: '300ms' }}
          className="relative text-sm text-black/40 font-medium"
        >
          от 0.82 € / ден със всичко включено
        </p>
      </section>

      {/* ══════════════════════════════════════════
          BENEFITS
      ══════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {[
            'Твоят сайт за 15 минути.',
            'Неограничени резервации.',
            'Клиентите са изцяло твои. Без комисионна.',
          ].map((text, i) => (
            <div key={i}>
              <p
                data-animate
                style={{
                  transitionDelay: `${i * 80}ms`,
                  fontSize: 'clamp(28px, 5vw, 56px)',
                  fontWeight: 700,
                  textAlign: 'center',
                  padding: '48px 0',
                  margin: 0,
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                }}
              >
                {text}
              </p>
              {i < 2 && <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.06)', margin: 0 }} />}
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section className="py-24 px-6 border-t border-black/6">
        <h2
          data-animate
          className="text-4xl sm:text-6xl md:text-7xl font-bold text-center mb-20 tracking-tight"
        >
          Три стъпки.
        </h2>

        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-12 sm:gap-8">
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              data-animate
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <span className="block text-8xl font-bold text-black/6 leading-none mb-4 select-none">
                {step.n}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold mb-3">{step.title}</h3>
              <p className="text-black/50 text-base leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════ */}
      <section className="py-24 px-6 border-t border-black/6">
        <h2
          data-animate
          className="text-4xl sm:text-5xl md:text-6xl font-bold text-center mb-4 tracking-tight"
        >
          Лесно. Прозрачно. Без изненади.
        </h2>

        <div className="max-w-5xl mx-auto mt-16 grid sm:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => (
            <div
              key={plan.id}
              data-animate
              style={{ transitionDelay: `${i * 80}ms` }}
              className={`rounded-3xl p-8 flex flex-col ${
                plan.popular
                  ? 'bg-black text-white'
                  : 'border border-black/10 text-black'
              }`}
            >
              {plan.popular && (
                <span className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-4 block">
                  Най-популярен
                </span>
              )}

              <h3 className={`text-2xl font-bold mb-1 ${plan.popular ? 'text-white' : 'text-black'}`}>
                {plan.name}
              </h3>
              <p className={`text-sm mb-6 ${plan.popular ? 'text-white/50' : 'text-black/40'}`}>
                {plan.desc}
              </p>

              <div className="mb-1">
                <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-black'}`}>
                  {plan.yearly} €
                </span>
                <span className={`text-sm ml-1 ${plan.popular ? 'text-white/50' : 'text-black/40'}`}>
                  / година
                </span>
              </div>
              <p className={`text-sm mb-8 ${plan.popular ? 'text-white/40' : 'text-black/35'}`}>
                от {plan.daily} € на ден
              </p>

              <ul className="space-y-3 flex-1">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <span className={`mt-0.5 text-base leading-none font-semibold ${plan.popular ? 'text-white' : 'text-black'}`}>
                      ✓
                    </span>
                    <span className={plan.popular ? 'text-white/80' : 'text-black/70'}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <div className={`mt-8 pt-6 border-t text-sm ${plan.popular ? 'border-white/10 text-white/50' : 'border-black/8 text-black/40'}`}>
                + SMS напомняния: <span className="font-semibold">9 € / месец</span>
              </div>

              <Link
                href={`/create?plan=${plan.id}`}
                className={`mt-6 block text-center py-3 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                  plan.popular
                    ? 'bg-white text-black hover:bg-gray-100'
                    : 'bg-black text-white hover:bg-gray-900'
                }`}
              >
                Избери {plan.name}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA
      ══════════════════════════════════════════ */}
      <section className="py-32 px-6 text-center border-t border-black/6">
        <h2
          data-animate
          className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-12 leading-tight"
        >
          Готова ли си?
        </h2>
        <div data-animate style={{ transitionDelay: '100ms' }}>
          <Link
            href="/create"
            className="inline-block bg-black text-white px-10 py-5 rounded-full text-lg font-semibold hover:bg-gray-900 active:scale-95 transition-all"
          >
            Създай своя сайт сега за минути →
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer className="border-t border-black/6 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-black/35">© 2025 Clicka.bg</span>
          <div className="flex gap-6 text-sm text-black/35">
            <Link href="/terms" className="hover:text-black transition-colors">
              Условия за ползване
            </Link>
            <Link href="/privacy" className="hover:text-black transition-colors">
              Поверителност
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
