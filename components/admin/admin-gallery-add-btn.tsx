'use client';

import { Plus, RefreshCw } from 'lucide-react';
import { useRef } from 'react';
import type { Locale } from '@/lib/i18n';

type Props = {
  busy: boolean;
  onUpload: (files: FileList | null, input?: HTMLInputElement | null) => void | Promise<void>;
  locale?: Locale;
};

export function AdminGalleryAddBtn({ busy, onUpload, locale = 'bg' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEn = locale === 'en';
  const label = isEn ? 'Add images' : 'Добави снимки';

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
          background: busy ? '#86efac' : '#22c55e',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: busy ? 'wait' : 'pointer',
          flexShrink: 0,
          boxShadow: '0 2px 10px rgba(34, 197, 94, 0.38)',
        }}
      >
        {busy ? <RefreshCw size={18} strokeWidth={2} /> : <Plus size={20} strokeWidth={2.5} />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        disabled={busy}
        onChange={e => void onUpload(e.target.files, e.target)}
      />
    </>
  );
}
