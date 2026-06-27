'use client';

import { Check, CheckCircle2, ImagePlus, RefreshCw, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react';
import { ADMIN_T } from '@/components/admin/admin-theme';
import type { Locale } from '@/lib/i18n';

export function AdminField({
  label,
  children,
  style,
  compact = false,
}: {
  label: string;
  children: ReactNode;
  style?: CSSProperties;
  compact?: boolean;
}) {
  const isMbl = typeof window !== 'undefined' && window.innerWidth < 768;
  return (
    <label style={{ display: 'grid', gap: compact ? 4 : isMbl ? 6 : 5, ...style }}>
      <span
        style={{
          fontSize: compact ? 12 : isMbl ? 13 : 12,
          fontWeight: compact ? 500 : 600,
          color: compact ? ADMIN_T.text : ADMIN_T.muted,
          letterSpacing: compact ? undefined : '0.01em',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

export function AdminSection({
  title,
  desc,
  action,
  children,
  compact = false,
  icon,
}: {
  title: ReactNode;
  desc?: string;
  action?: ReactNode;
  children: ReactNode;
  compact?: boolean;
  icon?: ReactNode;
}) {
  const isMbl = typeof window !== 'undefined' && window.innerWidth < 768;
  return (
    <div style={{ animation: 'slideInUp 300ms ease' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: compact ? 'center' : 'flex-start',
          gap: compact ? 10 : 16,
          marginBottom: isMbl ? (compact ? 12 : 18) : compact ? 10 : 18,
          flexWrap: compact ? 'nowrap' : 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: isMbl ? (compact ? 15 : 18) : compact ? 14 : 16,
              fontWeight: compact ? 600 : 700,
              letterSpacing: compact ? '-0.02em' : '-0.025em',
              color: ADMIN_T.text,
              lineHeight: 1.2,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            {icon}
            {title}
          </h2>
          {desc ? (
            <p style={{ margin: isMbl ? '6px 0 0' : '4px 0 0', fontSize: isMbl ? 14 : 13, color: ADMIN_T.muted, lineHeight: 1.5 }}>
              {desc}
            </p>
          ) : null}
        </div>
        {action ? <div style={{ flexShrink: 0, marginLeft: 'auto' }}>{action}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function AdminEmptyState({ title, desc }: { title: string; desc: string }) {
  const isMbl = typeof window !== 'undefined' && window.innerWidth < 768;
  return (
    <div
      style={{
        padding: isMbl ? '40px 24px' : '32px 20px',
        textAlign: 'center',
        background: isMbl ? '#FAFAFA' : 'transparent',
        border: isMbl ? 'none' : `1px dashed ${ADMIN_T.border}`,
        borderRadius: isMbl ? 20 : ADMIN_T.radiusSm,
      }}
    >
      <p style={{ margin: 0, fontSize: isMbl ? 16 : 14, fontWeight: 600, color: ADMIN_T.muted }}>{title}</p>
      <p style={{ margin: '8px 0 0', fontSize: isMbl ? 14 : 13, color: ADMIN_T.subtle, lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}

export function AdminInfoCard({
  title,
  status,
  children,
  locale = 'bg',
}: {
  title: ReactNode;
  status: 'connected' | 'pending';
  children: ReactNode;
  locale?: Locale;
}) {
  const isMbl = typeof window !== 'undefined' && window.innerWidth < 768;
  const isEn = locale === 'en';
  return (
    <div
      style={{
        border: isMbl ? 'none' : `1px solid ${ADMIN_T.border}`,
        borderRadius: isMbl ? 18 : ADMIN_T.radiusSm,
        padding: isMbl ? '18px 20px' : '14px 16px',
        background: ADMIN_T.surface,
        boxShadow: isMbl ? '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {status === 'connected' ? (
          <CheckCircle2 size={isMbl ? 18 : 14} style={{ color: '#10B981', flexShrink: 0 }} />
        ) : (
          <span
            style={{
              width: isMbl ? 18 : 14,
              height: isMbl ? 18 : 14,
              borderRadius: '50%',
              background: '#E5E7EB',
              flexShrink: 0,
              display: 'inline-block',
            }}
          />
        )}
        <span style={{ fontSize: isMbl ? 16 : 13, fontWeight: 600, color: ADMIN_T.text }}>{title}</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: status === 'connected' ? '#10B981' : ADMIN_T.subtle,
            marginLeft: 'auto',
            padding: '3px 10px',
            borderRadius: 100,
            background: status === 'connected' ? '#ECFDF5' : '#F4F4F5',
          }}
        >
          {status === 'connected' ? (isEn ? 'Connected' : 'Свързан') : (isEn ? 'Not connected' : 'Не е свързан')}
        </span>
      </div>
      {children}
    </div>
  );
}

export function AdminSaveBtn({
  label,
  busy,
  mobile,
  green = false,
  compact = false,
  locale = 'bg',
  onClick,
}: {
  label: string;
  busy: boolean;
  mobile: boolean;
  green?: boolean;
  compact?: boolean;
  locale?: Locale;
  onClick: () => void;
}) {
  const isEn = locale === 'en';
  const [saved, setSaved] = useState(false);
  const prevBusy = useRef(busy);
  useEffect(() => {
    if (prevBusy.current && !busy) {
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(t);
    }
    prevBusy.current = busy;
  }, [busy]);

  const GRAD = '#000';
  const gradText: CSSProperties = {
    backgroundImage: GRAD,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  if (mobile) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-label={label}
        title={label}
        style={{
          border: 'none',
          background: saved ? '#16a34a' : '#000',
          padding: '6px 16px',
          borderRadius: 999,
          cursor: busy ? 'wait' : 'pointer',
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 700,
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          opacity: busy ? 0.7 : 1,
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}
      >
        {busy ? (isEn ? 'Saving…' : 'Запазване…') : saved ? (isEn ? '✓ Saved' : '✓ Запазено') : label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: 'none',
        background: saved ? '#16a34a' : '#000',
        padding: '7px 16px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        color: '#fff',
        cursor: busy ? 'wait' : 'pointer',
        whiteSpace: 'nowrap',
        opacity: busy ? 0.7 : 1,
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
      }}
    >
      {busy ? (isEn ? 'Saving…' : 'Запазване…') : saved ? (isEn ? '✓ Saved' : '✓ Запазено') : (isEn ? 'Save' : 'Запази')}
    </button>
  );
}

export function AdminPreviewImg({
  src,
  alt,
  round = false,
  mobile = false,
}: {
  src: string;
  alt: string;
  round?: boolean;
  mobile?: boolean;
}) {
  return (
    <img
      src={src}
      alt={alt}
      style={{
        display: 'block',
        marginTop: mobile ? 0 : 8,
        width: round ? 80 : '100%',
        height: round ? 80 : mobile ? 180 : 140,
        objectFit: 'cover',
        borderRadius: round ? '50%' : mobile ? 18 : ADMIN_T.radiusSm,
        border: mobile ? 'none' : `1px solid ${ADMIN_T.border}`,
        boxShadow: mobile ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
      }}
    />
  );
}

function AdminFileUploadBtn({ label, busy, children, locale = 'bg' }: { label: string; busy: boolean; children: ReactNode; locale?: Locale }) {
  const isEn = locale === 'en';
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '7px 12px',
        border: `1px solid ${ADMIN_T.border}`,
        borderRadius: ADMIN_T.radiusSm,
        fontSize: 13,
        fontWeight: 500,
        color: ADMIN_T.text,
        cursor: busy ? 'wait' : 'pointer',
        background: ADMIN_T.surface,
      }}
    >
      <Upload size={13} />
      {busy ? (isEn ? 'Uploading…' : 'Качваме…') : label}
      {children}
    </label>
  );
}

export function AdminIconUploadBtn({ label, busy, children }: { label: string; busy: boolean; children: ReactNode }) {
  return (
    <label
      aria-label={label}
      title={label}
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        border: 'none',
        background: '#F4F4F5',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: busy ? 'wait' : 'pointer',
        flexShrink: 0,
        color: ADMIN_T.text,
      }}
    >
      {busy ? (
        <RefreshCw size={18} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
      ) : (
        <ImagePlus size={20} strokeWidth={1.8} />
      )}
      {children}
    </label>
  );
}

export function AdminImageAssetField({
  label,
  uploadLabel,
  busy,
  mobile,
  imageUrl,
  roundPreview = false,
  onUpload,
  children,
  locale = 'bg',
}: {
  label: string;
  uploadLabel: string;
  busy: boolean;
  mobile: boolean;
  imageUrl: string;
  roundPreview?: boolean;
  onUpload: (files: FileList | null) => void;
  children?: ReactNode;
  locale?: Locale;
}) {
  const uploadControl = mobile ? (
    <AdminIconUploadBtn label={uploadLabel} busy={busy}>
      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onUpload(e.target.files)} />
    </AdminIconUploadBtn>
  ) : (
    <AdminFileUploadBtn label={uploadLabel} busy={busy} locale={locale}>
      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onUpload(e.target.files)} />
    </AdminFileUploadBtn>
  );

  if (mobile) {
    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: imageUrl ? 10 : 0,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: ADMIN_T.text }}>{label}</span>
          {uploadControl}
        </div>
        {imageUrl ? <AdminPreviewImg src={imageUrl} alt={label} round={roundPreview} mobile /> : null}
        {children}
      </div>
    );
  }

  return (
    <AdminField label={label}>
      {uploadControl}
      {children}
      {imageUrl ? <AdminPreviewImg src={imageUrl} alt={label} round={roundPreview} /> : null}
    </AdminField>
  );
}

export function AdminGalleryDropZone({
  busy,
  mobile = false,
  onUpload,
  children,
  locale = 'bg',
}: {
  busy: boolean;
  mobile?: boolean;
  onUpload: (files: FileList | File[] | null, input?: HTMLInputElement | null) => void | Promise<void>;
  children: ReactNode;
  locale?: Locale;
}) {
  const isEn = locale === 'en';
  const [dragActive, setDragActive] = useState(false);
  const depthRef = useRef(0);

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    depthRef.current += 1;
    setDragActive(true);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    e.dataTransfer.dropEffect = 'copy';
    setDragActive(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    depthRef.current = Math.max(0, depthRef.current - 1);
    if (depthRef.current === 0) setDragActive(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    depthRef.current = 0;
    setDragActive(false);
    if (busy) return;
    void onUpload(e.dataTransfer.files);
  };

  return (
    <div style={{ position: 'relative' }} onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      {dragActive ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            borderRadius: ADMIN_T.radiusSm,
            border: `2px dashed ${ADMIN_T.text}`,
            background: 'rgba(255,255,255,0.94)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            pointerEvents: 'none',
          }}
        >
          <Upload size={mobile ? 24 : 28} color={ADMIN_T.text} strokeWidth={1.75} />
          <span style={{ fontSize: mobile ? 13 : 14, fontWeight: 700, color: ADMIN_T.text }}>
            {mobile ? (isEn ? 'Drop here' : 'Пусни тук') : (isEn ? 'Drop images here' : 'Пусни снимките тук')}
          </span>
          {!mobile ? <span style={{ fontSize: 12, color: ADMIN_T.muted }}>JPG, PNG, WebP, GIF</span> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
