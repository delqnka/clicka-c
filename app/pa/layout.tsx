import '@/app/admin/admin-tailwind.css';

export const metadata = {
  title: 'Agency Admin',
  robots: 'noindex, nofollow',
};

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
