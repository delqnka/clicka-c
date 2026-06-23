import '@/app/admin/admin-tailwind.css';
import '@/app/admin/admin-mobile.css';
import { AdminErrorBoundary } from '@/components/admin/admin-error-boundary';
import { getAdminLocale } from '@/lib/admin-locale';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = getAdminLocale();
  return <AdminErrorBoundary locale={locale}>{children}</AdminErrorBoundary>;
}
