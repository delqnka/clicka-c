'use client';

import dynamic from 'next/dynamic';
import { type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { AdminGalleryAddBtn } from '@/components/admin/admin-gallery-add-btn';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField, AdminGalleryDropZone, AdminSaveBtn, AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';

const GalleryReorderGrid = dynamic(
  () => import('@/components/admin/gallery-reorder-grid').then((m) => m.GalleryReorderGrid),
  { ssr: false }
);

function GalleryGrid({
  uploadBtn,
  images,
  isMobile,
  busyKey,
  pendingUrls,
  uploadProgress,
  btn,
  onUpload,
  onReorder,
  onRemove,
  uploadedLabel = 'Качени',
}: {
  uploadBtn: ReactNode;
  images: string[];
  isMobile: boolean;
  busyKey: string;
  pendingUrls: ReadonlySet<string>;
  uploadProgress: { done: number; total: number } | null;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  onUpload: (files: FileList | File[] | null, input?: HTMLInputElement | null) => void | Promise<void>;
  onReorder: (next: string[]) => void;
  onRemove: (index: number) => void;
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
              isMobile={isMobile}
              pendingUrls={pendingUrls}
              btnSmGhost={btn('sm-ghost')}
              onReorder={onReorder}
              onRemove={onRemove}
            />
          </AdminGalleryDropZone>
        </AdminField>
      )}
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
  handlePortfolioUpload: (files: FileList | File[] | null, input?: HTMLInputElement | null) => void | Promise<void>;
}) {
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
      <GalleryGrid
        uploadedLabel="Качени снимки"
        uploadBtn={
          <AdminGalleryAddBtn busy={busyKey === 'upload-portfolio'} onUpload={handlePortfolioUpload} />
        }
        images={site.images}
        isMobile={isMobile}
        busyKey={busyKey === 'upload-portfolio' ? busyKey : ''}
        pendingUrls={portfolioPending}
        uploadProgress={portfolioUploadProgress}
        btn={btn}
        onUpload={handlePortfolioUpload}
        onReorder={(next) => {
          setSite((p) => ({ ...p, images: next }));
          setNotice('Редът е променен. Натисни Запази.');
        }}
        onRemove={(i) =>
          setSite((p) => ({
            ...p,
            images: p.images.filter((_, j) => j !== i),
          }))
        }
      />
    </AdminSection>
  );
}
