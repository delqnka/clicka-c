import { ClickaLogo } from '@/components/brand/clicka-logo';

const FONT = "var(--font-client-manrope,'Manrope',system-ui,sans-serif)";
const GRAD = 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)';

export function SuccessLoadingShell() {
  return (
    <div style={{ background: '#fff', fontFamily: FONT, display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <nav style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid rgba(0,0,0,.07)', background: '#fff' }}>
        <ClickaLogo size="compact" />
      </nav>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, boxShadow: '0 8px 28px rgba(219,39,119,.32)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 style={{ fontSize: 'clamp(24px,6vw,38px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.03em', lineHeight: 1.15, color: '#0D0D12' }}>
          Подготвяме твоя салон...
        </h1>
        <p style={{ fontSize: 15, color: '#667085', maxWidth: 340, lineHeight: 1.65, margin: 0 }}>
          Само момент, настройваме всичко за теб.
        </p>
      </div>
    </div>
  );
}
