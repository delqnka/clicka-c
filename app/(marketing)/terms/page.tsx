import { ClickaTermsContent } from '@/components/legal/clicka-terms-content';

export const metadata = {
  title: 'Общи условия — Clicka.bg',
  description: 'Общи условия за ползване на платформата Clicka.bg',
};

export default function TermsPage() {
  return (
    <main
      style={{
        maxWidth: 780,
        margin: '0 auto',
        padding: '48px 24px 80px',
        fontFamily: 'var(--font-client-manrope, "Manrope", system-ui, sans-serif)',
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
      <ClickaTermsContent />
    </main>
  );
}
