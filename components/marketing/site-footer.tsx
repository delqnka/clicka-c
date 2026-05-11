import Link from 'next/link';
import { clickaMarketingSite } from '@/lib/clicka-marketing-site';

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
        <p className="text-sm font-medium tracking-[-0.02em] text-white/50">
          © {new Date().getFullYear()} {clickaMarketingSite.legal}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/40 sm:gap-6">
          <Link href="/create" className="text-white/55 transition hover:text-accent">
            Създай сайт
          </Link>
          <span className="hidden sm:inline">·</span>
          <span className="hover:text-white/60">София</span>
          <Link href="mailto:hello@clicka.bg" className="hover:text-white/80">
            hello@clicka.bg
          </Link>
        </div>
      </div>
    </footer>
  );
}
