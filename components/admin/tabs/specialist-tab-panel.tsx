'use client';

import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { adminGrid2 } from '@/components/admin/admin-theme';
import { AdminField, AdminIconUploadBtn, AdminPreviewImg, AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';

export function SpecialistTabPanel({
  site,
  setSite,
  inp,
  btn,
  busyKey,
  saveSpecialist,
  onOwnerPhotoUpload,
}: {
  site: AdminSitePayload;
  setSite: Dispatch<SetStateAction<AdminSitePayload>>;
  inp: CSSProperties;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  busyKey: string;
  saveSpecialist: () => void;
  onOwnerPhotoUpload: (file: File | null) => void;
}) {
  return (
    <AdminSection
      title="Специалист"
      desc='Захранва секцията „Вашият специалист" в сайта.'
      action={
        <button type="button" onClick={saveSpecialist} style={btn('primary')} disabled={busyKey === 'specialist'}>
          {busyKey === 'specialist' ? 'Запазваме…' : 'Запази профила'}
        </button>
      }
    >
      <div style={adminGrid2}>
        <AdminField label="Име">
          <input value={site.ownerName} onChange={(e) => setSite((p) => ({ ...p, ownerName: e.target.value }))} style={inp} />
        </AdminField>
        <AdminField label="Роля">
          <input
            value={site.ownerPublicRole}
            onChange={(e) => setSite((p) => ({ ...p, ownerPublicRole: e.target.value }))}
            style={inp}
          />
        </AdminField>
      </div>
      <div style={{ marginTop: 12 }}>
        <AdminField label="Био">
          <textarea
            value={site.ownerPublicBio}
            onChange={(e) => setSite((p) => ({ ...p, ownerPublicBio: e.target.value }))}
            style={{ ...inp, minHeight: 96, resize: 'vertical' }}
            placeholder="Кратко представяне на специалиста..."
          />
        </AdminField>
      </div>
      <div style={{ marginTop: 12 }}>
        <AdminField label="Снимка на специалиста">
          <AdminIconUploadBtn label="Качи снимка" busy={busyKey === 'upload-owner'}>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => void onOwnerPhotoUpload(e.target.files?.[0] ?? null)}
            />
          </AdminIconUploadBtn>
          <input
            value={site.ownerPublicPhotoUrl}
            onChange={(e) => setSite((p) => ({ ...p, ownerPublicPhotoUrl: e.target.value }))}
            style={{ ...inp, marginTop: 6 }}
            placeholder="https://…"
          />
          {site.ownerPublicPhotoUrl ? (
            <AdminPreviewImg src={site.ownerPublicPhotoUrl} alt="Специалист" round />
          ) : null}
        </AdminField>
      </div>
    </AdminSection>
  );
}
