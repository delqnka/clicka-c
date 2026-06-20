'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

const CLARITY_ID = 'x2t2g8dohk';
const META_PIXEL_ID = '2880139309045289';
const GA_MEASUREMENT_ID = 'G-SJW99ZTGX3';

// Hosts where the Clicka.bg *marketing* pixels should fire. Public-NEXT vars are
// readable client-side. Defaults match the canonical Clicka.bg deploy; a
// rebranded engine deploy sets NEXT_PUBLIC_ROOT_DOMAIN and these tags become
// inert on that host.
const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'clicka.bg').toLowerCase();
const MARKETING_DOMAINS = [ROOT_DOMAIN, `www.${ROOT_DOMAIN}`, 'localhost'];

export function TrackingScripts() {
  const [allowed, setAllowed] = useState(false);
  const [isClickaDomain, setIsClickaDomain] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    setIsClickaDomain(MARKETING_DOMAINS.includes(hostname));

    const check = () => setAllowed(localStorage.getItem('cookie-consent') === 'yes');
    check();
    window.addEventListener('cookie-consent-updated', check);
    return () => window.removeEventListener('cookie-consent-updated', check);
  }, []);

  if (!isClickaDomain) return null;

  return (
    <>
      {/* Meta Pixel — init + PageView винаги */}
      <Script id="meta-pixel-base" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${META_PIXEL_ID}');
        fbq('track', 'PageView');
      `}</Script>
      <noscript><img height="1" width="1" style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
      /></noscript>

      {/* GA + Clarity — само след consent */}
      {allowed && (
        <>
          <Script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="lazyOnload" />
          <Script id="ga-analytics" strategy="lazyOnload">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}</Script>
          <Script id="clarity-analytics" strategy="lazyOnload">{`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_ID}");
          `}</Script>
        </>
      )}
    </>
  );
}
