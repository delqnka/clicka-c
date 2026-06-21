import SignInClient from '@/components/admin/SignInClient';
import { LangToggle } from '@/components/admin/LangToggle';
import { getAdminLocale } from '@/lib/admin-locale';

export const dynamic = 'force-dynamic';

export default function AdminSignInPage() {
  const locale = getAdminLocale();
  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif', background: '#fff' }}>
      <LangToggle current={locale} />
      <SignInClient locale={locale} />
    </div>
  );
}
