'use client';

import dynamic from 'next/dynamic';
import { useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from 'react';
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
  { id: 'portfolio', label: 'Портфолио' },
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
              borderRadius: 999,
              border: active ? `1px solid ${ADMIN_T.text}` : `1px solid ${ADMIN_T.border}`,
              background: active ? ADMIN_T.text : '#fff',
              color: active ? '#fff' : ADMIN_T.text,
              padding: '5px 11px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
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

      <AdminField
        compact
        label={images.length > 0 ? `${uploadedLabel} · ${images.length}` : 'Качи снимки'}
      >
        {uploadProgress ? (
          <p style={{ margin: '0 0 8px', fontSize: 12, color: ADMIN_T.muted, lineHeight: 1.4 }}>
            Качваме {uploadProgress.done}/{uploadProgress.total}…
          </p>
        ) : null}
        <AdminGalleryDropZone busy={busyKey !== ''} mobile={isMobile} onUpload={onUpload}>
          {images.length > 0 ? (
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
          ) : (
            <GalleryEmptyHint isMobile={isMobile} text={emptyHint} />
          )}
        </AdminGalleryDropZone>
      </AdminField>
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
        <AdminImageAssetField
          label="Лого"
          uploadLabel="Качи лого"
          busy={busyKey === 'upload-logo'}
          mobile={isMobile}
          imageUrl={site.logoImageUrl}
          roundPreview
          onUpload={(files) => void handleLogoUpload(files?.[0] ?? null)}
        />
      ) : null}

      {section === 'cover' ? (
        <AdminImageAssetField
          label="Cover (горна снимка)"
          uploadLabel="Качи cover"
          busy={busyKey === 'upload-cover'}
          mobile={isMobile}
          imageUrl={site.coverImageUrl}
          onUpload={(files) => void handleCoverUpload(files?.[0] ?? null)}
        >
          {site.coverImageUrl ? (
            <button
              type="button"
              style={{
                marginTop: 8,
                fontSize: 12,
                color: '#EF4444',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
              }}
              onClick={() => {
                setSite((p) => ({ ...p, coverImageUrl: '' }));
                setNotice('Cover премахнат. Натисни „Запази".');
              }}
            >
              Премахни cover
            </button>
          ) : null}
        </AdminImageAssetField>
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
          emptyHint={isMobile ? 'Натисни + за снимки в портфолиото' : 'Натисни + или плъзни файлове тук.'}
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
