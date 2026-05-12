import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';
import { ADMIN_COOKIE_NAME, resolveAdminGate } from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug, loadBookingsBySalonId } from '@/lib/admin-site';

export const dynamic = 'force-dynamic';

export default async function AdminPage({ params }: { params: { slug: string } }) {
  const sessionId = cookies().get(ADMIN_COOKIE_NAME)?.value ?? null;
  const gate = await resolveAdminGate({
    slug: params.slug,
    sessionId,
  });

  if (gate.kind === 'missing-salon') notFound();
  if (gate.kind === 'claim') redirect(`/${gate.salon.slug}/claim`);
  if (gate.kind === 'sign-in') redirect(`/${gate.salon.slug}/admin/sign-in`);

  const [site, bookings] = await Promise.all([
    loadAdminSiteDataBySlug(gate.salon.slug),
    loadBookingsBySalonId(gate.salon.salonId, 200),
  ]);

  if (!site) notFound();

  return (
    <AdminDashboardClient
      slug={gate.salon.slug}
      ownerEmail={gate.session.ownerEmail}
      initialSite={site}
      initialBookings={bookings}
    />
  );
}

