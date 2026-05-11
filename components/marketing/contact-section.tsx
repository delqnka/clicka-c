'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Reveal } from '@/components/marketing/reveal';
import { clickaMarketingSite } from '@/lib/clicka-marketing-site';

export function ContactSection() {
  return (
    <section
      id="contact"
      className="relative border-t border-white/[0.06] py-24 sm:py-32"
      aria-labelledby="contact-title"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/40">Контакт</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl" id="contact-title">
              Въпроси? <span className="text-white/50">Пиши ни.</span>
            </h2>
            <p className="mt-5 max-w-md text-sm text-white/55">
              Имейл за партньорства и поддръжка. За нова регистрация на сайт използвай бутона — води те през целия
              процес.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="glass bento-tight max-w-md rounded-2xl p-6 sm:rounded-3xl sm:p-8 lg:max-w-none">
              <p className="text-sm text-white/55">{clickaMarketingSite.legal} — {clickaMarketingSite.name}</p>
              <motion.div className="mt-8 flex flex-col gap-4" whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                <Link
                  href="/create"
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-gradient-to-b from-white/14 to-white/6 py-3.5 text-sm font-semibold tracking-[-0.02em] text-white transition hover:border-accent/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Създай моя сайт
                </Link>
                <a
                  href="mailto:hello@clicka.bg"
                  className="text-center text-sm font-medium text-accent underline-offset-4 hover:underline"
                >
                  hello@clicka.bg
                </a>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
