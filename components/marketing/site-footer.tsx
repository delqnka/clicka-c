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
          <span className="hidden sm:inline">·</span>
          <Link
            href="https://www.facebook.com/clickabg"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link inline-flex items-center gap-1"
            aria-label="Clicka във Facebook"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
            Facebook
          </Link>
        </div>
      </div>
    </footer>
  );
}
