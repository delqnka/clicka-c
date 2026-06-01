import Link from 'next/link';
import { clickaMarketingSite } from '@/lib/clicka-marketing-site';

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0a0a0a] py-10">
      <style>{`
        .footer-link {
          transition: color 0.2s;
        }
        .footer-link:hover {
          background: linear-gradient(135deg, #e11d48, #db2777, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
        <p className="text-sm font-medium tracking-[-0.02em] text-white/50">
          © {new Date().getFullYear()} {clickaMarketingSite.legal}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/40 sm:gap-6">
          <Link href="/create" className="footer-link text-white/55">
            Създай сайт
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
