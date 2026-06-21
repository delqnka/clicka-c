import SetPasswordClient from '@/components/admin/SetPasswordClient';
import { LangToggle } from '@/components/admin/LangToggle';
import { getAdminLocale } from '@/lib/admin-locale';

export const dynamic = 'force-dynamic';

export default function SetPasswordPage() {
  const locale = getAdminLocale();
  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 36px',
      fontFamily: 'var(--font-client-manrope, system-ui, -apple-system, sans-serif)',
      background: '#fff',
    }}>
      <LangToggle current={locale} />
      <div style={{ width: '100%', maxWidth: 400 }}>
        <SetPasswordClient locale={locale} />
      </div>
    </div>
  );
}
