'use client';

import { RefreshCw, ScanLine, X } from 'lucide-react';
import { useRef, type ReactNode } from 'react';

function UploadInputWrapper({
  busy,
  onUpload,
  children,
}: {
  busy: boolean;
  onUpload: (files: FileList | null, input?: HTMLInputElement | null) => void | Promise<void>;
  children: (onClick: () => void) => ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      {children(() => inputRef.current?.click())}
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
  size = 'md',
  onUpload,
}: {
  busy: boolean;
  size?: 'sm' | 'md';
  onUpload: (files: FileList | null, input?: HTMLInputElement | null) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dim = size === 'sm' ? 34 : 40;
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <>
      <button
        type="button"
        aria-label="Качи ценоразпис"
        title="Качи ценоразпис"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        style={{
          width: dim,
          height: dim,
          borderRadius: '50%',
          border: 'none',
          background: busy ? '#86efac' : '#22c55e',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: busy ? 'wait' : 'pointer',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(34, 197, 94, 0.32)',
        }}
      >
        {busy ? <RefreshCw size={iconSize} strokeWidth={2} /> : <ScanLine size={iconSize} strokeWidth={2.25} />}
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
    if (compact) {
      // Tappable upload row — full width, clear instruction
      return (
        <UploadInputWrapper onUpload={onUpload} busy={busy || analyzing}>
          {(onClick) => (
            <button
              type="button"
              onClick={onClick}
              disabled={busy || analyzing}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                marginBottom: 4,
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.05) 0%, rgba(16,185,129,0.05) 100%)',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: '#22c55e', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
              }}>
                <ScanLine size={18} strokeWidth={2.25} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                  Качи снимка на ценоразписа
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#71717A', lineHeight: 1.4 }}>
                  AI ще добави услугите автоматично
                </p>
              </div>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </UploadInputWrapper>
      );
    }

    return (
      <div
        style={{
          marginBottom: 16,
          padding: '10px 0',
          border: 'none',
          borderRadius: 0,
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexDirection: 'row',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#18181B' }}>Ценоразпис с AI</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#71717A', lineHeight: 1.4 }}>
            Снимай ценоразписа — услугите се добавят автоматично.
          </p>
        </div>
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
          <AdminPriceListScanBtn busy={busy || analyzing} size={compact ? 'sm' : 'md'} onUpload={onUpload} />
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
