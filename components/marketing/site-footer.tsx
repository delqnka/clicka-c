import Link from 'next/link';
import { clickaMarketingSite } from '@/lib/clicka-marketing-site';

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0a0a0a] py-10" style={{ position: 'relative', zIndex: 2 }}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <p className="text-sm font-medium tracking-[-0.02em] text-white/50">
            © {new Date().getFullYear()} {clickaMarketingSite.legal}
          </p>
          <p className="text-xs text-white/30">Буука ЕООД</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/40 sm:gap-6">
          <Link href="/create" className="footer-link text-white/55">
            Създай сайт
          </Link>
          <Link href="/features" className="footer-link text-white/55">
            Функции
          </Link>
          <Link href="/pricing" className="footer-link text-white/55">
            Цени
          </Link>
          <Link href="/faq" className="footer-link text-white/55">
            FAQ
          </Link>
          <span className="hidden sm:inline">·</span>
          <Link href="/terms" className="footer-link">
            Общи условия
          </Link>
          <Link href="/privacy" className="footer-link">
            Поверителност
          </Link>
          <Link href="/cookies" className="footer-link">
            Бисквитки
          </Link>
          <span className="hidden sm:inline">·</span>
          <Link href="mailto:support@clicka.bg" className="footer-link">
            support@clicka.bg
          </Link>
        </div>
      </div>
    </footer>
  );
}
