import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';
import { ADMIN_COOKIE_NAME, resolveAdminGate } from '@/lib/admin-auth';
import { getHostAwareSalonPath } from '@/lib/domain-routing';
import { loadAdminOffersBySalonId } from '@/lib/admin-offers-load';
import { loadAdminSiteDataBySlug, loadBookingsBySalonId } from '@/lib/admin-site';

export const dynamic = 'force-dynamic';

export default async function AdminEntryPage() {
  const headerStore = headers();
  const sessionId = cookies().get(ADMIN_COOKIE_NAME)?.value ?? null;
  const gate = await resolveAdminGate({
    slug: headerStore.get('x-salon-slug'),
    host: headerStore.get('host'),
    sessionId,
  });

  if (gate.kind === 'missing-salon') {
    redirect('/');
  }

  if (gate.kind === 'claim') {
    redirect(
      getHostAwareSalonPath({
        host: headerStore.get('host'),
        slug: gate.salon.slug,
        path: 'claim',
      })
    );
  }

  if (gate.kind === 'sign-in') {
    redirect(
      getHostAwareSalonPath({
        host: headerStore.get('host'),
        slug: gate.salon.slug,
        path: 'admin/sign-in',
      })
    );
  }

  const [site, bookings, initialOffers] = await Promise.all([
    loadAdminSiteDataBySlug(gate.salon.slug),
    loadBookingsBySalonId(gate.salon.salonId, 200),
    loadAdminOffersBySalonId(gate.salon.salonId),
  ]);

  if (!site) notFound();

  return (
    <AdminDashboardClient
      slug={gate.salon.slug}
      ownerEmail={gate.session.ownerEmail}
      initialSite={site}
      initialBookings={bookings}
      initialOffers={initialOffers}
    />
  );
}

