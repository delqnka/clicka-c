import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';
import { AdminLoadError } from '@/components/admin/AdminLoadError';
import { OnboardingTour } from '@/components/admin/OnboardingTour';
import { ADMIN_COOKIE_NAME, resolveAdminGate } from '@/lib/admin-auth';
import { getBrowserHost, getHostAwareSalonPath } from '@/lib/domain-routing';
import { loadAdminAccountInfo } from '@/lib/admin-account-load';
import { loadAdminOffersBySalonId } from '@/lib/admin-offers-load';
import { loadAdminSiteDataBySlug } from '@/lib/admin-site';
import { getAdminLocale } from '@/lib/admin-locale';

export const dynamic = 'force-dynamic';

export default async function AdminEntryPage() {
  const locale = getAdminLocale();
  const headerStore = headers();
  // browserHost honors X-Forwarded-Host so admin works when a client site
  // (e.g. salonurban.online) proxies /admin/* to this engine deployment.
  const browserHost = getBrowserHost(headerStore);
  const sessionId = cookies().get(ADMIN_COOKIE_NAME)?.value ?? null;
  const gate = await resolveAdminGate({
    slug: headerStore.get('x-salon-slug'),
    host: browserHost,
    sessionId,
  });

  // Explicit trace — drop after admin onboarding is verified working in prod.
  console.log('[admin/page] trace', {
    host: headerStore.get('host'),
    'x-clicka-host': headerStore.get('x-clicka-host'),
    'x-forwarded-host': headerStore.get('x-forwarded-host'),
    'x-salon-slug': headerStore.get('x-salon-slug'),
    browserHost,
    hasSession: !!sessionId,
    gateKind: gate.kind,
    salonSlug: 'salon' in gate ? gate.salon.slug : null,
  });

  if (gate.kind === 'missing-salon') {
    redirect('/');
  }

  if (gate.kind === 'claim') {
    redirect(
      getHostAwareSalonPath({
        host: browserHost,
        slug: gate.salon.slug,
        path: 'claim',
      })
    );
  }

  if (gate.kind === 'sign-in') {
    redirect(
      getHostAwareSalonPath({
        host: browserHost,
        slug: gate.salon.slug,
        path: 'admin/sign-in',
      })
    );
  }

  let site: Awaited<ReturnType<typeof loadAdminSiteDataBySlug>>;
  let initialOffers: Awaited<ReturnType<typeof loadAdminOffersBySalonId>>;
  let initialAccount: Awaited<ReturnType<typeof loadAdminAccountInfo>>;

  try {
    [site, initialOffers, initialAccount] = await Promise.all([
      loadAdminSiteDataBySlug(gate.salon.slug),
      loadAdminOffersBySalonId(gate.salon.salonId),
      loadAdminAccountInfo(gate.session.ownerId),
    ]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : (locale === 'en' ? 'Error while loading the salon' : 'Грешка при зареждане на салона');
    console.error('[admin/page] load failed:', message, err);
    return <AdminLoadError message={message} locale={locale} />;
  }

  if (!site) notFound();

  return (
    <>
    <OnboardingTour slug={gate.salon.slug} done={site.onboardingTourDone || !!site.customDomain} locale={site.language} />
    <AdminDashboardClient
      slug={gate.salon.slug}
      ownerEmail={gate.session.ownerEmail}
      initialSite={site}
      initialOffers={initialOffers}
      initialAccount={{
        displayName: initialAccount.displayName,
        loginEmail: gate.session.ownerEmail,
        hasPassword: initialAccount.hasPassword,
        pendingEmail: initialAccount.pendingEmail,
      }}
    />
    </>
  );
}
