import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';
import { OnboardingTour } from '@/components/admin/OnboardingTour';
import { ADMIN_COOKIE_NAME, resolveAdminGate } from '@/lib/admin-auth';
import { getHostAwareSalonPath } from '@/lib/domain-routing';
import { loadAdminAccountInfo } from '@/lib/admin-account-load';
import { loadAdminOffersBySalonId } from '@/lib/admin-offers-load';
import { loadAdminSiteDataBySlug } from '@/lib/admin-site';

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

  const [site, initialOffers, initialAccount] = await Promise.all([
    loadAdminSiteDataBySlug(gate.salon.slug),
    loadAdminOffersBySalonId(gate.salon.salonId),
    loadAdminAccountInfo(gate.session.ownerId),
  ]);

  if (!site) notFound();

  return (
    <>
    <OnboardingTour slug={gate.salon.slug} done={site.onboardingTourDone} />
    <AdminDashboardClient
      slug={gate.salon.slug}
      ownerEmail={gate.session.ownerEmail}
      initialSite={site}
      initialOffers={initialOffers}
      initialAccount={{
        loginEmail: gate.session.ownerEmail,
        hasPassword: initialAccount.hasPassword,
        pendingEmail: initialAccount.pendingEmail,
      }}
    />
    </>
  );
}
