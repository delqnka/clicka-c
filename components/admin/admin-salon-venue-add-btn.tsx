'use client';

import { Building2, RefreshCw } from 'lucide-react';
import { useRef } from 'react';
import type { Locale } from '@/lib/i18n';

type Props = {
  busy: boolean;
  onUpload: (files: FileList | null, input?: HTMLInputElement | null) => void | Promise<void>;
  locale?: Locale;
};

/** Upload button for salon interior / venue photos. */
export function AdminSalonVenueAddBtn({ busy, onUpload, locale = 'bg' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEn = locale === 'en';
  const label = isEn ? 'Add salon photos' : 'Добави снимки на салона';

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 'none',
          background: busy ? '#c4b5fd' : '#000',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: busy ? 'wait' : 'pointer',
          flexShrink: 0,
          boxShadow: '0 2px 12px rgba(0,0,0, 0.35)',
        }}
      >
        {busy ? <RefreshCw size={18} strokeWidth={2} /> : <Building2 size={18} strokeWidth={2.1} />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        disabled={busy}
        onChange={(e) => void onUpload(e.target.files, e.target)}
      />
    </>
  );
}
