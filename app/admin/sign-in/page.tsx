import SignInClient from '@/components/admin/SignInClient';
import { LangToggle } from '@/components/admin/LangToggle';
import { getAdminLocale } from '@/lib/admin-locale';
import type { Locale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default function AdminSignInPage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  // Same invite-lock pattern as set-password: when arrived via magic link
  // the URL carries `?lang=` and the toggle stays hidden.
  const langParam = searchParams?.lang === 'en' || searchParams?.lang === 'bg'
    ? (searchParams.lang as Locale)
    : null;
  const locale: Locale = langParam ?? getAdminLocale();
  const inviteLocked = langParam !== null;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif", background: '#fff' }}>
      {inviteLocked ? null : <LangToggle current={locale} />}
      <SignInClient locale={locale} />
    </div>
  );
}
