import Link from 'next/link';
import { ClickaLogo } from '@/components/brand/clicka-logo';
import { ButtonColorful } from '@/components/ui/button-colorful';

export function MarketingHomeHeader() {
  return (
    <header>
      <nav className="hp-nav" aria-label="Главна навигация">
        <ClickaLogo size="nav" priority />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px,2vw,24px)' }}>
          <Link
            href="/pricing"
            style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted-foreground)', textDecoration: 'none' }}
          >
            Цени
          </Link>
          <ButtonColorful href="/create" label="Стартирай" className="h-9 rounded-full px-5 text-[13px] font-semibold" />
        </div>
      </nav>
    </header>
  );
}
