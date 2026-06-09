'use client';

import dynamic from 'next/dynamic';

const CookieConsentBanner = dynamic(
  () => import('@/components/analytics/CookieConsentBanner').then((m) => ({ default: m.CookieConsentBanner })),
  { ssr: false },
);

const SalonTrackingScripts = dynamic(
  () => import('@/components/analytics/SalonTrackingScripts').then((m) => ({ default: m.SalonTrackingScripts })),
  { ssr: false },
);

type Props = {
  cookiesPath: string;
  primaryColor?: string;
  ga4Id?: string | null;
  metaPixelId?: string | null;
  clarityId?: string | null;
};

export function SalonPublicChrome({
  cookiesPath,
  primaryColor,
  ga4Id,
  metaPixelId,
  clarityId,
}: Props) {
  return (
    <>
      <SalonTrackingScripts ga4Id={ga4Id} metaPixelId={metaPixelId} clarityId={clarityId} />
      <CookieConsentBanner cookiesPath={cookiesPath} variant="salon" primaryColor={primaryColor} />
    </>
  );
}
