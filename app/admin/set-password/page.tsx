import SetPasswordClient from '@/components/admin/SetPasswordClient';
import { LangToggle } from '@/components/admin/LangToggle';
import { getAdminLocale } from '@/lib/admin-locale';
import type { Locale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default function SetPasswordPage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  // When the page is opened from a magic-link invite, the agency-picked
  // language travels in `?lang=`. In that case we lock the UI to that
  // language and hide the toggle so the recipient never sees a chooser.
  const langParam = searchParams?.lang === 'en' || searchParams?.lang === 'bg'
    ? (searchParams.lang as Locale)
    : null;
  const locale: Locale = langParam ?? getAdminLocale();
  const inviteLocked = langParam !== null;

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 36px',
      fontFamily: "'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif",
      background: '#fff',
    }}>
      {inviteLocked ? null : <LangToggle current={locale} />}
      <div style={{ width: '100%', maxWidth: 400 }}>
        <SetPasswordClient locale={locale} />
      </div>
    </div>
  );
}
