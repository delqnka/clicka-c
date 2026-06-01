import { ClickaPrivacyContent } from '@/components/legal/clicka-privacy-content';

export const metadata = {
  title: 'Политика за поверителност — Clicka.bg',
  description: 'Политика за поверителност и защита на личните данни на Clicka.bg',
};

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 780,
        margin: '0 auto',
        padding: '48px 24px 80px',
        fontFamily: 'system-ui, sans-serif',
        color: '#1a1a1a',
        lineHeight: 1.7,
      }}
    >
      <a
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: '#6b7280',
          textDecoration: 'none',
          marginBottom: 32,
        }}
      >
        ← Обратно към Clicka.bg
      </a>
      <ClickaPrivacyContent />
    </main>
  );
}
