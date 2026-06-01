import dynamic from 'next/dynamic';

export const LazySiteTabPanel = dynamic(
  () => import('@/components/admin/tabs/site-tab-panel').then((m) => m.SiteTabPanel),
  { ssr: false }
);
export const LazyImagesTabPanel = dynamic(
  () => import('@/components/admin/tabs/images-tab-panel').then((m) => m.ImagesTabPanel),
  { ssr: false }
);
export const LazySpecialistTabPanel = dynamic(
  () => import('@/components/admin/tabs/specialist-tab-panel').then((m) => m.SpecialistTabPanel),
  { ssr: false }
);
export const LazyHoursTabPanel = dynamic(
  () => import('@/components/admin/tabs/hours-tab-panel').then((m) => m.HoursTabPanel),
  { ssr: false }
);
export const LazyIntegrationsTabPanel = dynamic(
  () => import('@/components/admin/tabs/integrations-tab-panel').then((m) => m.IntegrationsTabPanel),
  { ssr: false }
);
export const LazySmsTabPanel = dynamic(
  () => import('@/components/admin/tabs/sms-tab-panel').then((m) => m.SmsTabPanel),
  { ssr: false }
);
export const LazyLegalTabPanel = dynamic(
  () => import('@/components/admin/tabs/legal-tab-panel').then((m) => m.LegalTabPanel),
  { ssr: false }
);
