'use client';

import { useEffect } from 'react';
import Link from 'next/link';

const PALETTE = {
  cream: '#F8F4EE',
  beige: '#EDE3D4',
  charcoal: '#1F1F1F',
  champagne: '#C8A96B',
};

export default function Page() {
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
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-[#F8F4EE] text-[#1F1F1F]">
      <nav className="sticky top-0 z-50 bg-[#F8F4EE]/95 backdrop-blur border-b border-[#C8A96B]/25">
        <div className="mx-auto max-w-6xl h-16 px-6 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight font-serif">
            clicka.bg
          </Link>
          <Link
            href="/create"
            className="bg-[#1F1F1F] text-[#F8F4EE] text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-all"
          >
            Започни сега
          </Link>
        </div>
      </nav>

      <section className="min-h-[calc(100vh-64px)] px-6 py-16 flex items-center">
        <div className="mx-auto max-w-5xl text-center">
          <h1
            data-animate
            className="fade-in text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight font-serif"
          >
            Твоят талант заслужава дигитален дом, толкова красив, колкото работата ти.
          </h1>
          <p data-animate className="fade-in mt-6 text-base md:text-xl text-[#4B5563] max-w-3xl mx-auto leading-relaxed">
            Спри да бъдеш секретарка на собствения си талант. Върни си спокойствието с професионален сайт и автоматични резервации 24/7.
          </p>
          <div data-animate className="fade-in mt-10">
            <Link
              href="/create"
              className="inline-flex items-center justify-center bg-[#1F1F1F] text-[#F8F4EE] text-base md:text-lg font-semibold px-8 py-4 rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              Създай своя сайт за 15 минути
            </Link>
            <p className="mt-4 text-sm text-[#6B7280]">От 0.82 € / ден — без скрити такси.</p>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6">
          <div data-animate className="fade-in rounded-2xl border border-[#C8A96B]/30 bg-white/80 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C8A96B] font-semibold">The Chaos</p>
            <p className="mt-4 text-lg md:text-xl leading-relaxed">
              Телефонът звъни, докато подстригваш. Клиенти пишат в 23:00. Плащаш комисионни на чужди платформи.
            </p>
          </div>
          <div data-animate className="fade-in rounded-2xl border border-[#C8A96B]/30 bg-[#EDE3D4]/70 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C8A96B] font-semibold">The Peace</p>
            <p className="mt-4 text-lg md:text-xl leading-relaxed">
              Клиентите резервират сами. Календарът ти е под контрол. 100% от печалбата остава за теб.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 bg-white">
        <div className="mx-auto max-w-6xl">
          <h2 data-animate className="fade-in text-3xl md:text-5xl font-bold tracking-tight font-serif">
            Три стъпки до твоя сайт.
          </h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div data-animate className="fade-in">
              <p className="text-5xl font-bold text-[#C8A96B] font-serif">01</p>
              <h3 className="mt-3 text-2xl font-bold font-serif">Избери своя план.</h3>
            </div>
            <div data-animate className="fade-in">
              <p className="text-5xl font-bold text-[#C8A96B] font-serif">02</p>
              <h3 className="mt-3 text-2xl font-bold font-serif">
                Снимай ценоразписа си — нашият AI автоматично ще разпознае услугите и цените ти. Без ръчно въвеждане!
              </h3>
            </div>
            <div data-animate className="fade-in">
              <p className="text-5xl font-bold text-[#C8A96B] font-serif">03</p>
              <h3 className="mt-3 text-2xl font-bold font-serif">
                Вземи своя линк и започни да приемаш часове веднага.
              </h3>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div data-animate className="fade-in rounded-2xl border border-[#C8A96B]/30 bg-white/90 p-7 md:p-10">
            <h2 className="text-3xl md:text-4xl font-bold leading-tight font-serif">
              15 резервации изплащат сайта за цяла година. Спестяваш над 300€ на месец от комисионни.
            </h2>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 bg-white">
        <div className="mx-auto max-w-6xl">
          <h2 data-animate className="fade-in text-3xl md:text-5xl font-bold tracking-tight text-center font-serif">
            Пакети за различните етапи на твоя салон.
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <PricingCard
              title="Независим артист"
              plan="SOLO"
              price="299€/год."
              daily="От 0.82 € / ден"
              href="/create?plan=solo"
            />
            <PricingCard
              title="Растящо студио"
              plan="ЕКИП"
              price="399€/год."
              daily="От 1.09 € / ден"
              href="/create?plan=ekip"
              featured
            />
            <PricingCard
              title="Империя за красота"
              plan="СТУДИО"
              price="599€/год."
              daily="От 1.64 € / ден"
              href="/create?plan=studio"
            />
          </div>
        </div>
      </section>

      <section className="px-6 pt-20 pb-8 bg-[#1F1F1F] text-[#F8F4EE]">
        <div className="mx-auto max-w-4xl text-center">
          <h2 data-animate className="fade-in text-4xl md:text-6xl font-bold tracking-tight font-serif">
            Готова ли си да върнеш контрола върху бизнеса си?
          </h2>
          <p data-animate className="fade-in mt-4 text-lg text-[#F8F4EE]/75">
            Clicka.bg е твоят тих, красив дигитален рецепционист.
          </p>
          <div data-animate className="fade-in mt-8">
            <Link
              href="/create"
              className="inline-flex items-center justify-center bg-[#C8A96B] text-[#1F1F1F] text-lg font-bold px-8 py-4 rounded-xl hover:brightness-95 transition-all hover:-translate-y-0.5"
            >
              Създай своя сайт за 15 минути
            </Link>
            <p className="mt-4 text-sm text-[#F8F4EE]/80">От 0.82 € / ден — без скрити такси.</p>
          </div>
        </div>
      </section>

      <footer className="bg-[#1F1F1F] text-[#F8F4EE] px-6 py-8 border-t border-[#C8A96B]/30">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row gap-3 justify-between text-sm text-[#F8F4EE]/90">
          <p>© 2025 Clicka.bg</p>
          <p>Условия за ползване · Поверителност</p>
        </div>
      </footer>

      <style jsx>{`
        .fade-in {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .fade-in.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </main>
  );
}

function PricingCard({
  title,
  plan,
  price,
  daily,
  href,
  featured = false,
}: {
  title: string;
  plan: string;
  price: string;
  daily: string;
  href: string;
  featured?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#C8A96B]/30 p-6 bg-[#F8F4EE] transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
      {featured && (
        <span className="inline-flex bg-[#C8A96B] text-[#1F1F1F] text-xs font-bold px-3 py-1 rounded-full mb-4">
          Най-избиран
        </span>
      )}
      <h3 className="text-2xl font-bold font-serif">{title}</h3>
      <p className="mt-2 text-sm uppercase tracking-wide text-[#6B7280]">{plan}</p>
      <p className="mt-2 text-3xl font-bold">{price}</p>
      <p className="text-[#6B7280]">{daily}</p>
      <Link
        href={href}
        className="mt-6 inline-flex w-full justify-center bg-[#1F1F1F] text-[#F8F4EE] font-semibold py-3 rounded-xl hover:opacity-90 transition-colors"
      >
        Избери своя план
      </Link>
    </div>
  );
}
