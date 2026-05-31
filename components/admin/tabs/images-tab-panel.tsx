'use client';

import dynamic from 'next/dynamic';
import { useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { AdminGalleryAddBtn } from '@/components/admin/admin-gallery-add-btn';
import { AdminSalonVenueAddBtn } from '@/components/admin/admin-salon-venue-add-btn';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField, AdminGalleryDropZone, AdminImageAssetField, AdminSaveBtn, AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';

const GalleryReorderGrid = dynamic(
  () => import('@/components/admin/gallery-reorder-grid').then((m) => m.GalleryReorderGrid),
  { ssr: false }
);

const IMAGE_SECTIONS = [
  { id: 'logo', label: 'Лого' },
  { id: 'cover', label: 'Cover' },
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
        label={images.length > 0 ? `Качени · ${images.length}` : 'Качи снимки'}
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
  galleryPending,
  portfolioPending,
  galleryUploadProgress,
  portfolioUploadProgress,
  saveImages,
  handleCoverUpload,
  handleLogoUpload,
  handleGalleryUpload,
  handlePortfolioUpload,
}: {
  site: AdminSitePayload;
  setSite: Dispatch<SetStateAction<AdminSitePayload>>;
  setNotice: (msg: string) => void;
  isMobile: boolean;
  inp: CSSProperties;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  busyKey: string;
  galleryPending: Set<string>;
  portfolioPending: Set<string>;
  galleryUploadProgress: { done: number; total: number } | null;
  portfolioUploadProgress: { done: number; total: number } | null;
  existingServiceCategories: string[];
  saveImages: () => void | Promise<void>;
  handleCoverUpload: (file: File | null) => void | Promise<void>;
  handleLogoUpload: (file: File | null) => void | Promise<void>;
  handleGalleryUpload: (files: FileList | File[] | null, input?: HTMLInputElement | null) => void | Promise<void>;
  handlePortfolioUpload: (files: FileList | File[] | null, input?: HTMLInputElement | null) => void | Promise<void>;
}) {
  const [section, setSection] = useState<ImageSectionId>('cover');

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
        <div style={{ display: 'grid', gap: 14 }}>
          <AdminImageAssetField
            label="Cover (горна снимка)"
            uploadLabel="Качи cover"
            busy={busyKey === 'upload-cover'}
            mobile={isMobile}
            imageUrl={site.coverImageUrl}
            onUpload={(files) => void handleCoverUpload(files?.[0] ?? null)}
          />
          <GalleryGrid
            showSetCover
            uploadBtn={
              <AdminSalonVenueAddBtn busy={busyKey === 'upload-gallery'} onUpload={handleGalleryUpload} />
            }
            images={site.galleryImages}
            coverImageUrl={site.coverImageUrl}
            isMobile={isMobile}
            busyKey={busyKey === 'upload-gallery' ? busyKey : ''}
            pendingUrls={galleryPending}
            uploadProgress={galleryUploadProgress}
            btn={btn}
            setSite={setSite}
            onUpload={handleGalleryUpload}
            onReorder={(next) => {
              setSite((p) => ({ ...p, galleryImages: next }));
              setNotice('Редът е променен. Натисни Запази.');
            }}
            onRemove={(i) =>
              setSite((p) => {
                const removed = p.galleryImages[i];
                const galleryImages = p.galleryImages.filter((_, j) => j !== i);
                return {
                  ...p,
                  galleryImages,
                  coverImageUrl: p.coverImageUrl === removed ? (galleryImages[0] ?? '') : p.coverImageUrl,
                };
              })
            }
            emptyHint={isMobile ? 'Натисни + за снимки в hero галерията' : 'Натисни + или плъзни файлове тук.'}
          />
        </div>
      ) : null}

      {section === 'portfolio' ? (
        <GalleryGrid
          uploadBtn={
            <AdminGalleryAddBtn busy={busyKey === 'upload-portfolio'} onUpload={handlePortfolioUpload} />
          }
          images={site.portfolioImages}
          coverImageUrl={site.coverImageUrl}
          isMobile={isMobile}
          busyKey={busyKey === 'upload-portfolio' ? busyKey : ''}
          pendingUrls={portfolioPending}
          uploadProgress={portfolioUploadProgress}
          btn={btn}
          setSite={setSite}
          onUpload={handlePortfolioUpload}
          onReorder={(next) => {
            setSite((p) => ({ ...p, portfolioImages: next }));
            setNotice('Редът е променен. Натисни Запази.');
          }}
          onRemove={(i) =>
            setSite((p) => ({
              ...p,
              portfolioImages: p.portfolioImages.filter((_, j) => j !== i),
            }))
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
