'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { AdminGalleryAddBtn } from '@/components/admin/admin-gallery-add-btn';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField, AdminGalleryDropZone, AdminImageAssetField, AdminSaveBtn, AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';

const GalleryReorderGrid = dynamic(
  () => import('@/components/admin/gallery-reorder-grid').then((m) => m.GalleryReorderGrid),
  { ssr: false }
);

export function ImagesTabPanel({
  site,
  setSite,
  setNotice,
  isMobile,
  inp,
  btn,
  busyKey,
  galleryPending,
  galleryUploadProgress,
  existingServiceCategories,
  saveImages,
  handleCoverUpload,
  handleLogoUpload,
  handleGalleryUpload,
}: {
  site: AdminSitePayload;
  setSite: Dispatch<SetStateAction<AdminSitePayload>>;
  setNotice: (msg: string) => void;
  isMobile: boolean;
  inp: CSSProperties;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  busyKey: string;
  galleryPending: Set<string>;
  galleryUploadProgress: { done: number; total: number } | null;
  existingServiceCategories: string[];
  saveImages: () => void | Promise<void>;
  handleCoverUpload: (file: File | null) => void | Promise<void>;
  handleLogoUpload: (file: File | null) => void | Promise<void>;
  handleGalleryUpload: (files: FileList | File[] | null) => void | Promise<void>;
}) {
  return (
    <AdminSection
      title="Снимки"
      compact={isMobile}
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <AdminGalleryAddBtn busy={busyKey === 'upload-gallery'} onUpload={handleGalleryUpload} />
          <AdminSaveBtn
            label="Запази снимките"
            busy={busyKey === 'images' || busyKey === 'images-auto'}
            mobile={isMobile}
            onClick={() => void saveImages()}
          />
        </div>
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

      <div
        style={{
          marginTop: isMobile ? 28 : 24,
          paddingTop: isMobile ? 20 : 18,
          borderTop: `1px solid ${ADMIN_T.border}`,
        }}
      >
        <p style={{ margin: 0, fontSize: isMobile ? 16 : 15, fontWeight: 700, color: ADMIN_T.text }}>
          Снимки на салона
        </p>
        <p style={{ margin: '6px 0 14px', fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.55 }}>
          Качете снимки на интериора, екипа или работата си. Показват се в галерията на сайта. Ако няма качени снимки,
          секцията „Снимки“ не се вижда от клиентите.
        </p>
        <AdminField
          label={
            site.galleryImages.length > 0
              ? isMobile
                ? `Качени · ${site.galleryImages.length}`
                : `Качени снимки (${site.galleryImages.length})`
              : 'Качи снимки'
          }
        >
          {galleryUploadProgress ? (
            <p style={{ margin: '0 0 10px', fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.45 }}>
              Качваме {galleryUploadProgress.done}/{galleryUploadProgress.total}…
            </p>
          ) : null}
          <AdminGalleryDropZone busy={busyKey === 'upload-gallery'} mobile={isMobile} onUpload={handleGalleryUpload}>
            {site.galleryImages.length > 0 ? (
              <GalleryReorderGrid
                images={site.galleryImages}
                coverImageUrl={site.coverImageUrl}
                isMobile={isMobile}
                pendingUrls={galleryPending}
                btnSmGhost={btn('sm-ghost')}
                onReorder={(next) => {
                  setSite((p) => ({ ...p, galleryImages: next }));
                  setNotice('Редът е променен. Натисни дискетата, за да запазиш.');
                }}
                onSetCover={(url) => setSite((p) => ({ ...p, coverImageUrl: url }))}
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
              />
            ) : (
              <GalleryEmptyHint isMobile={isMobile} />
            )}
          </AdminGalleryDropZone>
        </AdminField>
      </div>
    </AdminSection>
  );
}

function GalleryEmptyHint({ isMobile }: { isMobile: boolean }) {
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
      {isMobile
        ? 'Натисни + за да добавиш снимки на салона'
        : 'Все още няма снимки на салона. Натисни + или плъзни файлове тук.'}
    </div>
  );
}
