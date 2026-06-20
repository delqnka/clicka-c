import '@/app/admin/admin-tailwind.css';

export const metadata = {
  title: 'Platform Admin — Clicka.bg',
  robots: 'noindex, nofollow',
};

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
