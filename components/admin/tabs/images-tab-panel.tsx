'use client';

import dynamic from 'next/dynamic';
import { Plus, RefreshCw } from 'lucide-react';
import { useRef, useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { AdminGalleryAddBtn } from '@/components/admin/admin-gallery-add-btn';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField, AdminGalleryDropZone, AdminImageAssetField, AdminSaveBtn, AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';
import { mergeUniqueImageLists } from '@/lib/admin-image-utils';

const GalleryReorderGrid = dynamic(
  () => import('@/components/admin/gallery-reorder-grid').then((m) => m.GalleryReorderGrid),
  { ssr: false }
);

const IMAGE_SECTIONS = [
  { id: 'cover', label: 'Начална' },
  { id: 'portfolio', label: 'Портфолио' },
  { id: 'logo', label: 'Лого (SEO)' },
] as const;

type ImageSectionId = (typeof IMAGE_SECTIONS)[number]['id'];

function SectionPills({
  section,
  onChange,
}: {
  section: ImageSectionId;
  onChange: (id: ImageSectionId) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        flexWrap: 'nowrap',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        marginBottom: 12,
        paddingBottom: 2,
      }}
    >
      {IMAGE_SECTIONS.map(({ id, label }) => {
        const active = section === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: '2px solid transparent',
              backgroundImage: active
                ? 'linear-gradient(135deg,#e11d48,#db2777,#a855f7), linear-gradient(135deg,#e11d48,#db2777,#a855f7)'
                : 'none',
              backgroundSize: active ? '100% 2px, 100%' : 'auto',
              backgroundPosition: active ? '0 100%, 0 0' : 'auto',
              backgroundRepeat: 'no-repeat',
              backgroundColor: 'transparent',
              WebkitBackgroundClip: active ? 'border-box, text' : undefined,
              backgroundClip: active ? 'border-box, text' : undefined,
              WebkitTextFillColor: active ? 'transparent' : undefined,
              color: active ? '#e11d48' : ADMIN_T.muted,
              padding: '4px 2px',
              marginRight: 14,
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              borderRadius: 0,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function GalleryGrid({
  uploadBtn,
  images,
  coverImageUrl,
  isMobile,
  busyKey,
  pendingUrls,
  uploadProgress,
  btn,
  setSite,
  onUpload,
  onReorder,
  onRemove,
  emptyHint,
  showSetCover = false,
  uploadedLabel = 'Качени',
}: {
  uploadBtn: ReactNode;
  images: string[];
  coverImageUrl: string;
  isMobile: boolean;
  busyKey: string;
  pendingUrls: ReadonlySet<string>;
  uploadProgress: { done: number; total: number } | null;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  setSite: Dispatch<SetStateAction<AdminSitePayload>>;
  onUpload: (files: FileList | File[] | null, input?: HTMLInputElement | null) => void | Promise<void>;
  onReorder: (next: string[]) => void;
  onRemove: (index: number) => void;
  emptyHint: string;
  showSetCover?: boolean;
  uploadedLabel?: string;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginBottom: 10,
        }}
      >
        {uploadBtn}
      </div>

      {uploadProgress ? (
        <p style={{ margin: '0 0 8px', fontSize: 12, color: ADMIN_T.muted, lineHeight: 1.4 }}>
          Качваме {uploadProgress.done}/{uploadProgress.total}…
        </p>
      ) : null}
      {images.length > 0 && (
        <AdminField compact label={`${uploadedLabel} · ${images.length}`}>
          <AdminGalleryDropZone busy={busyKey !== ''} mobile={isMobile} onUpload={onUpload}>
            <GalleryReorderGrid
              images={images}
              coverImageUrl={coverImageUrl}
              isMobile={isMobile}
              pendingUrls={pendingUrls}
              btnSmGhost={btn('sm-ghost')}
              onReorder={onReorder}
              onSetCover={showSetCover ? (url) => setSite((p) => ({ ...p, coverImageUrl: url })) : undefined}
              enableSetCover={showSetCover}
              onRemove={onRemove}
            />
          </AdminGalleryDropZone>
        </AdminField>
      )}
    </div>
  );
}

function SingleImageUploadSection({
  imageUrl,
  busy,
  roundPreview = false,
  onUpload,
  onRemove,
}: {
  imageUrl: string;
  busy: boolean;
  roundPreview?: boolean;
  onUpload: (file: File | null) => void;
  onRemove?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: imageUrl ? 10 : 0 }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          style={{
            width: 40, height: 40, borderRadius: '50%', border: 'none',
            background: busy ? '#86efac' : '#22c55e', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            cursor: busy ? 'wait' : 'pointer',
            boxShadow: '0 2px 10px rgba(34,197,94,0.38)',
          }}
        >
          {busy ? <RefreshCw size={18} strokeWidth={2} /> : <Plus size={20} strokeWidth={2.5} />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => onUpload(e.target.files?.[0] ?? null)}
        />
      </div>
      {imageUrl ? (
        <div>
          <img
            src={imageUrl}
            alt="preview"
            style={{
              width: roundPreview ? 96 : '100%',
              height: roundPreview ? 96 : 180,
              objectFit: 'cover',
              borderRadius: roundPreview ? '50%' : 12,
              display: 'block',
            }}
          />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              style={{ marginTop: 8, fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
            >
              Премахни
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ImagesTabPanel({
  site,
  setSite,
  setNotice,
  isMobile,
  btn,
  busyKey,
  portfolioPending,
  portfolioUploadProgress,
  saveImages,
  handleCoverUpload,
  handleLogoUpload,
  handlePortfolioUpload,
}: {
  site: AdminSitePayload;
  setSite: Dispatch<SetStateAction<AdminSitePayload>>;
  setNotice: (msg: string) => void;
  isMobile: boolean;
  inp: CSSProperties;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  busyKey: string;
  portfolioPending: Set<string>;
  portfolioUploadProgress: { done: number; total: number } | null;
  existingServiceCategories: string[];
  saveImages: () => void | Promise<void>;
  handleCoverUpload: (file: File | null) => void | Promise<void>;
  handleLogoUpload: (file: File | null) => void | Promise<void>;
  handlePortfolioUpload: (files: FileList | File[] | null, input?: HTMLInputElement | null) => void | Promise<void>;
}) {
  const [section, setSection] = useState<ImageSectionId>('portfolio');
  const uploadedImages = mergeUniqueImageLists(site.portfolioImages, site.galleryImages);

  const syncUploadedImages = (next: string[]) => {
    setSite((p) => ({
      ...p,
      portfolioImages: next,
      galleryImages: next,
    }));
  };

  return (
    <AdminSection
      title="Снимки"
      compact
      action={
        <AdminSaveBtn
          label="Запази"
          busy={busyKey === 'images' || busyKey === 'images-auto'}
          mobile={isMobile}
          green
          compact
          onClick={() => void saveImages()}
        />
      }
    >
      <SectionPills section={section} onChange={setSection} />

      {section === 'logo' ? (
        <SingleImageUploadSection
          imageUrl={site.logoImageUrl}
          busy={busyKey === 'upload-logo'}
          roundPreview
          onUpload={(f) => void handleLogoUpload(f)}
        />
      ) : null}

      {section === 'cover' ? (
        <SingleImageUploadSection
          imageUrl={site.coverImageUrl}
          busy={busyKey === 'upload-cover'}
          onUpload={(f) => void handleCoverUpload(f)}
          onRemove={() => {
            setSite((p) => ({ ...p, coverImageUrl: '' }));
            setNotice('Начална снимка премахната. Натисни „Запази".');
          }}
        />
      ) : null}

      {section === 'portfolio' ? (
        <GalleryGrid
          showSetCover
          uploadedLabel="Качени снимки"
          uploadBtn={
            <AdminGalleryAddBtn busy={busyKey === 'upload-portfolio'} onUpload={handlePortfolioUpload} />
          }
          images={uploadedImages}
          coverImageUrl={site.coverImageUrl}
          isMobile={isMobile}
          busyKey={busyKey === 'upload-portfolio' ? busyKey : ''}
          pendingUrls={portfolioPending}
          uploadProgress={portfolioUploadProgress}
          btn={btn}
          setSite={setSite}
          onUpload={handlePortfolioUpload}
          onReorder={(next) => {
            syncUploadedImages(next);
            setNotice('Редът е променен. Натисни Запази.');
          }}
          onRemove={(i) =>
            setSite((p) => {
              const merged = mergeUniqueImageLists(p.portfolioImages, p.galleryImages);
              const removed = merged[i];
              const next = merged.filter((_, j) => j !== i);
              return {
                ...p,
                portfolioImages: next,
                galleryImages: next,
                coverImageUrl: p.coverImageUrl === removed ? (next[0] ?? '') : p.coverImageUrl,
              };
            })
          }
          emptyHint={isMobile ? '' : ''}
        />
      ) : null}
    </AdminSection>
  );
}

function GalleryEmptyHint({ isMobile, text }: { isMobile: boolean; text: string }) {
  return (
    <div
      style={{
        padding: isMobile ? '32px 16px' : '24px 14px',
        textAlign: 'center',
        border: isMobile ? 'none' : `1.5px dashed ${ADMIN_T.border}`,
        borderRadius: isMobile ? 16 : 12,
        background: isMobile ? '#FAFAFA' : 'transparent',
        color: ADMIN_T.muted,
        fontSize: isMobile ? 13 : 12,
        lineHeight: 1.45,
      }}
    >
      {text}
    </div>
  );
}
