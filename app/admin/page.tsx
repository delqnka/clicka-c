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

  console.log('[admin/page] gate.kind=', gate.kind, 'slug=', gate.salon.slug);

  let site, initialOffers, initialAccount;
  try {
    [site, initialOffers, initialAccount] = await Promise.all([
      loadAdminSiteDataBySlug(gate.salon.slug),
      loadAdminOffersBySalonId(gate.salon.salonId),
      loadAdminAccountInfo(gate.session.ownerId),
    ]);
    console.log('[admin/page] data loaded, site=', site ? 'ok' : 'null');
  } catch (err: unknown) {
    const e = err as Error;
    console.error('[admin/page] CRASH:', e?.message);
    console.error('[admin/page] STACK:', e?.stack);
    throw err;
  }

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
