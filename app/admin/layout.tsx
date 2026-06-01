import '@/app/(marketing)/marketing-tailwind.css';
import '@/app/admin/admin-mobile.css';
import { AdminErrorBoundary } from '@/components/admin/admin-error-boundary';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminErrorBoundary>{children}</AdminErrorBoundary>;
}
