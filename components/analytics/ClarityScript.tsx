'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

export function ClarityScript() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = () => setAllowed(localStorage.getItem('cookie-consent') === 'yes');
    check();
    window.addEventListener('cookie-consent-updated', check);
    return () => window.removeEventListener('cookie-consent-updated', check);
  }, []);

  if (!CLARITY_ID || !allowed) return null;

  return (
    <Script
      id="ms-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");
        `,
      }}
    />
  );
}
