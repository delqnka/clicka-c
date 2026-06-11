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
          <Link
            href="https://www.instagram.com/clickabg"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link inline-flex items-center gap-1"
            aria-label="Clicka в Instagram"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
            @clickabg
          </Link>
        </div>
      </div>
    </footer>
  );
}
