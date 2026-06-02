import { redirect } from 'next/navigation';

export default function StripeReturnPage({
  searchParams,
}: {
  searchParams: { slug?: string; refresh?: string };
}) {
  const slug = searchParams.slug ?? '';
  // redirect back to admin dashboard with ?tab=payments so the UI auto-refreshes status
  const dest = slug ? `/${slug}/admin?tab=payments` : '/admin?tab=payments';
  redirect(dest);
}
