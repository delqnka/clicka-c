'use client';

import { RefreshCw, ScanLine, X } from 'lucide-react';
import { useRef } from 'react';

type Props = {
  urls: string[];
  busy: boolean;
  analyzing: boolean;
  isMobile: boolean;
  /** Shorter copy and tighter spacing for modals */
  compact?: boolean;
  onUpload: (files: FileList | null, input?: HTMLInputElement | null) => void | Promise<void>;
  onRemove: (index: number) => void;
  onReanalyze: () => void;
};

export function AdminPriceListScanBtn({
  busy,
  onUpload,
}: {
  busy: boolean;
  onUpload: (files: FileList | null, input?: HTMLInputElement | null) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label="Качи ценоразпис"
        title="Качи ценоразпис"
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
        {busy ? <RefreshCw size={18} strokeWidth={2} /> : <ScanLine size={18} strokeWidth={2.25} />}
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

export function PriceListServicesImport({
  urls,
  busy,
  analyzing,
  isMobile,
  compact = false,
  onUpload,
  onRemove,
  onReanalyze,
}: Props) {
  if (urls.length === 0 && !analyzing) {
    return (
      <div
        style={{
          marginBottom: compact ? 0 : 16,
          padding: compact ? 0 : '10px 0',
          border: 'none',
          borderRadius: 0,
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexDirection: 'row',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#18181B' }}>Ценоразпис с AI</p>
          {!compact ? (
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#71717A', lineHeight: 1.45 }}>
              Снимай хартиения си ценоразпис — услугите се добавят автоматично.
            </p>
          ) : null}
        </div>
        <AdminPriceListScanBtn busy={busy || analyzing} onUpload={onUpload} />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: compact ? 0 : 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#18181B' }}>
          Ценоразпис{urls.length > 0 ? ` · ${urls.length}` : ''}
          {analyzing ? ' · AI…' : ''}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {urls.length > 0 && !analyzing ? (
            <button
              type="button"
              onClick={onReanalyze}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                fontSize: 12,
                fontWeight: 600,
                color: '#71717A',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Разчети отново
            </button>
          ) : null}
          <AdminPriceListScanBtn busy={busy || analyzing} onUpload={onUpload} />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(3, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(88px, 1fr))',
          gap: 8,
          opacity: analyzing ? 0.65 : 1,
          pointerEvents: analyzing ? 'none' : 'auto',
        }}
      >
        {urls.map((url, i) => (
          <div
            key={`${url}-${i}`}
            style={{
              position: 'relative',
              aspectRatio: '1',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #E5E3DE',
            }}
          >
            <img
              src={url}
              alt={`Ценоразпис ${i + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <button
              type="button"
              aria-label={`Премахни ценоразпис ${i + 1}`}
              onClick={() => onRemove(i)}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(24,24,27,0.72)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        ))}
        {analyzing ? (
          <div
            style={{
              aspectRatio: '1',
              borderRadius: 12,
              border: '1px dashed #E5E3DE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FAFAFA',
            }}
          >
            <RefreshCw size={22} color="#71717A" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
