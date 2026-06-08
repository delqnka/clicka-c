'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { getConsentPreferences, type ConsentPreferences } from '@/lib/cookie-consent';

type Props = {
  ga4Id?: string | null;
  metaPixelId?: string | null;
  clarityId?: string | null;
};

export function SalonTrackingScripts({ ga4Id, metaPixelId, clarityId }: Props) {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);

  useEffect(() => {
    setConsent(getConsentPreferences());
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent<ConsentPreferences>).detail;
      setConsent(detail ?? getConsentPreferences());
    }
    window.addEventListener('cookie-consent-updated', onUpdate);
    return () => window.removeEventListener('cookie-consent-updated', onUpdate);
  }, []);

  // Fire ClickaTest when admin opens public site with ?pixelTest=1
  // Runs only after consent + pixel load — waits for the pixel script to initialize.
  useEffect(() => {
    if (!metaPixelId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('pixelTest') !== '1') return;

    let tries = 0;
    const interval = setInterval(() => {
      if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', 'ClickaTest', { source: 'admin_test' });
        clearInterval(interval);
        // Clean up URL so refreshing doesn't re-fire
        const url = new URL(window.location.href);
        url.searchParams.delete('pixelTest');
        window.history.replaceState({}, '', url.toString());
      }
      if (++tries > 20) clearInterval(interval); // give up after ~10s
    }, 500);

    return () => clearInterval(interval);
  }, [metaPixelId, consent?.marketing]);

  const analyticsOk = consent?.analytics === true;
  const marketingOk = consent?.marketing === true;

  return (
    <>
      {analyticsOk && ga4Id && (
        <>
          <Script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id={`ga4-${ga4Id}`} strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${ga4Id}');
          `}</Script>
        </>
      )}

      {analyticsOk && clarityId && (
        <Script id={`clarity-${clarityId}`} strategy="afterInteractive">{`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${clarityId}");
        `}</Script>
      )}

      {marketingOk && metaPixelId && (
        <>
          <Script id={`fbpixel-${metaPixelId}`} strategy="afterInteractive">{`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
          `}</Script>
          <noscript>
            <img
              height="1" width="1" style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}
    </>
  );
}
