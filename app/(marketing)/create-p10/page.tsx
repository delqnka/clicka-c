'use client';

import { Suspense } from 'react';
import { CreatePageContent } from '../create/CreatePageContent';

export default function CreateP10Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center bg-[#ffffff] text-[#6b7280]"
        style={{ fontFamily: "var(--font-client-manrope, 'Manrope', system-ui, sans-serif)" }}>
        Зареждане…
      </div>
    }>
      <CreatePageContent showSixMonth={false} backHref="/purvite-10" />
    </Suspense>
  );
}
