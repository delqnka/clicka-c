'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { AdminGalleryAddBtn } from '@/components/admin/admin-gallery-add-btn';
import { AdminSalonVenueAddBtn } from '@/components/admin/admin-salon-venue-add-btn';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField, AdminGalleryDropZone, AdminImageAssetField, AdminSaveBtn, AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';

const GalleryReorderGrid = dynamic(
  () => import('@/components/admin/gallery-reorder-grid').then((m) => m.GalleryReorderGrid),
  { ssr: false }
);

function GallerySection({
  title,
  description,
  uploadBtn,
  images,
  coverImageUrl,
  isMobile,
  busyKey,
  pendingUrls,
  uploadProgress,
  btn,
  setSite,
  setNotice,
  onUpload,
  onReorder,
  onRemove,
  emptyHint,
}: {
  title: string;
  description: string;
  uploadBtn: React.ReactNode;
  images: string[];
  coverImageUrl: string;
  isMobile: boolean;
  busyKey: string;
  pendingUrls: ReadonlySet<string>;
  uploadProgress: { done: number; total: number } | null;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  setSite: Dispatch<SetStateAction<AdminSitePayload>>;
  setNotice: (msg: string) => void;
  onUpload: (files: FileList | File[] | null, input?: HTMLInputElement | null) => void | Promise<void>;
  onReorder: (next: string[]) => void;
  onRemove: (index: number) => void;
  emptyHint: string;
}) {
  return (
    <div
      style={{
        marginTop: isMobile ? 28 : 24,
        paddingTop: isMobile ? 20 : 18,
        borderTop: `1px solid ${ADMIN_T.border}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: isMobile ? 16 : 15, fontWeight: 700, color: ADMIN_T.text }}>
            {title}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.55 }}>{description}</p>
        </div>
        {uploadBtn}
      </div>

      <AdminField
        label={
          images.length > 0
            ? isMobile
              ? `Качени · ${images.length}`
              : `Качени снимки (${images.length})`
            : 'Качи снимки'
        }
      >
        {uploadProgress ? (
          <p style={{ margin: '0 0 10px', fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.45 }}>
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
              onSetCover={(url) => setSite((p) => ({ ...p, coverImageUrl: url }))}
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
  inp,
  btn,
  busyKey,
  galleryPending,
  portfolioPending,
  galleryUploadProgress,
  portfolioUploadProgress,
  existingServiceCategories,
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
  return (
    <AdminSection
      title="Снимки"
      compact={isMobile}
      action={
        <AdminSaveBtn
          label="Запази снимките"
          busy={busyKey === 'images' || busyKey === 'images-auto'}
          mobile={isMobile}
          onClick={() => void saveImages()}
        />
      }
    >
      <datalist id="service-category-options">
        {existingServiceCategories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: ADMIN_T.text }}>Брандинг</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
          gap: isMobile ? 20 : 12,
        }}
      >
        <AdminImageAssetField
          label="Cover (горна снимка)"
          uploadLabel="Качи cover"
          busy={busyKey === 'upload-cover'}
          mobile={isMobile}
          imageUrl={site.coverImageUrl}
          onUpload={(files) => void handleCoverUpload(files?.[0] ?? null)}
        />
        <AdminImageAssetField
          label="Лого"
          uploadLabel="Качи лого"
          busy={busyKey === 'upload-logo'}
          mobile={isMobile}
          imageUrl={site.logoImageUrl}
          roundPreview
          onUpload={(files) => void handleLogoUpload(files?.[0] ?? null)}
        />
      </div>

      <GallerySection
        title="Галерия"
        description="Снимки на помещението — показват се в горната част на сайта."
        uploadBtn={
          <AdminSalonVenueAddBtn
            busy={busyKey === 'upload-gallery'}
            onUpload={handleGalleryUpload}
          />
        }
        images={site.galleryImages}
        coverImageUrl={site.coverImageUrl}
        isMobile={isMobile}
        busyKey={busyKey === 'upload-gallery' ? busyKey : ''}
        pendingUrls={galleryPending}
        uploadProgress={galleryUploadProgress}
        btn={btn}
        setSite={setSite}
        setNotice={setNotice}
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
        emptyHint={
          isMobile
            ? 'Натисни иконата за да добавиш снимки на помещението'
            : 'Натисни иконата или плъзни файлове тук.'
        }
      />

      <GallerySection
        title="Портфолио (твоята работа)"
        description="Снимки на прически и резултати."
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
        setNotice={setNotice}
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
        emptyHint={
          isMobile
            ? 'Натисни + за да добавиш работа в портфолиото'
            : 'Натисни + или плъзни файлове тук.'
        }
      />
    </AdminSection>
  );
}

function GalleryEmptyHint({ isMobile, text }: { isMobile: boolean; text: string }) {
  return (
    <div
      style={{
        padding: isMobile ? '40px 20px' : '28px 16px',
        textAlign: 'center',
        border: isMobile ? 'none' : `1.5px dashed ${ADMIN_T.border}`,
        borderRadius: isMobile ? 20 : 14,
        background: isMobile ? '#FAFAFA' : 'transparent',
        color: ADMIN_T.muted,
        fontSize: isMobile ? 14 : 13,
        lineHeight: 1.5,
      }}
    >
      {text}
    </div>
  );
}
