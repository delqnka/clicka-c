import { ClickaLogo } from '@/components/brand/clicka-logo';
import { ButtonColorful } from '@/components/ui/button-colorful';

export function MarketingHomeHeader() {
  return (
    <header>
      <nav className="hp-nav" aria-label="Главна навигация">
        <ClickaLogo size="nav" priority />
        <ButtonColorful href="/create" label="Стартирай" className="h-9 rounded-full px-5 text-[13px] font-semibold" />
      </nav>
    </header>
  );
}
