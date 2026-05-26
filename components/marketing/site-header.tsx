'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import { ClickaLogo } from '@/components/brand/clicka-logo';

const links = [
  { href: '#services', label: 'Какво получаваш' },
  { href: '#work', label: 'Примери' },
  { href: '#contact', label: 'Контакт' },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const close = useCallback(() => setOpen(false), []);

  return (
    <motion.header
      className="fixed top-0 right-0 left-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/55 backdrop-blur-2xl"
      initial={{ y: -8, opacity: 1 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <ClickaLogo size="nav" variant="on-dark" />
        <nav className="hidden items-center gap-8 sm:flex" aria-label="Основна навигация">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-white/50 transition hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/create"
            className="hidden rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/90 transition hover:border-accent/40 sm:inline-block"
          >
            Започни сега
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/80 sm:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">Меню</span>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            id={menuId}
            className="border-b border-white/[0.06] bg-[#0a0a0a]/95 px-4 py-4 sm:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            aria-label="Мобилно меню"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={close}
                  className="rounded-lg px-2 py-2.5 text-sm text-white/80"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/create"
                onClick={close}
                className="mt-2 inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-medium text-white/90"
              >
                Започни сега
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
