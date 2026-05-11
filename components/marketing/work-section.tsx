'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@/components/marketing/reveal';
import { marketingShowcaseCards } from '@/lib/marketing-showcase-cards';

export function WorkSection() {
  return (
    <section
      id="work"
      className="relative border-t border-white/[0.06] py-24 sm:py-32"
      aria-labelledby="work-title"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:mb-14 sm:flex-row sm:items-end">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/40">Примери</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl" id="work-title">
              Визия, която продава час.
            </h2>
            <p className="mt-3 max-w-md text-sm text-white/45">
              Всяка карта води към стъпките за твой собствен сайт — същият тип подредба и стил, адаптирани за твоя
              бранд.
            </p>
          </Reveal>
        </div>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:max-w-none sm:grid-cols-3 sm:gap-4 sm:overflow-visible">
          {marketingShowcaseCards.map((p, i) => (
            <Reveal
              key={p.id}
              className="group relative min-w-[min(100%,20rem)] snap-center overflow-hidden rounded-2xl sm:min-w-0 glass"
              delay={0.04 * i}
            >
              <Link href="/create" className="absolute inset-0 z-10" aria-label={`Започни като ${p.title}`} />
              <div className="pointer-events-none relative aspect-[4/3] w-full sm:aspect-[4/3]">
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  sizes="(max-width: 640px) 85vw, 33vw"
                  className="object-cover transition duration-700 group-hover:scale-[1.03] group-focus-within:scale-[1.03]"
                  priority={i === 0}
                />
                <div className="bg-fade-bento absolute inset-0" />
                <div className="absolute right-0 bottom-0 left-0 p-5 sm:p-6">
                  <p className="text-xs text-white/50">{p.tag}</p>
                  <p className="text-lg font-medium tracking-[-0.02em] text-white">{p.title}</p>
                  <p className="mt-2 text-xs text-accent/90">Започни безплатно →</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-white/30 sm:mt-6 sm:hidden">Плъзни за още</p>
      </div>
    </section>
  );
}
