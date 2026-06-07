'use client';

import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { ImagePlus, RefreshCw, UserRound } from 'lucide-react';
import { adminGrid2, ADMIN_COMPACT_SAVE_BTN, ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField, AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';

function SpecialistPhotoUpload({
  photoUrl,
  busy,
  onUpload,
}: {
  photoUrl: string;
  busy: boolean;
  onUpload: (file: File | null) => void;
}) {
  return (
    <div style={{ display: 'inline-flex', position: 'relative' }}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt="Специалист"
          style={{
            display: 'block',
            width: 88,
            height: 88,
            borderRadius: '50%',
            objectFit: 'cover',
            border: `2px solid ${ADMIN_T.border}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        />
      ) : (
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #fafafa 0%, #f4f4f5 100%)',
            border: `1px dashed ${ADMIN_T.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#A1A1AA',
          }}
        >
          <UserRound size={34} strokeWidth={1.6} aria-hidden />
        </div>
      )}
      <label
        aria-label="Качи снимка на специалиста"
        title="Качи снимка"
        style={{
          position: 'absolute',
          right: -2,
          bottom: -2,
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '2px solid #fff',
          background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
          boxShadow: '0 4px 14px rgba(219,39,119,0.35)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: busy ? 'wait' : 'pointer',
          color: '#fff',
        }}
      >
        {busy ? (
          <RefreshCw size={16} strokeWidth={2.25} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <ImagePlus size={16} strokeWidth={2.25} aria-hidden />
        )}
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          disabled={busy}
          onChange={(e) => {
            onUpload(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}

export function SpecialistTabPanel({
  site,
  setSite,
  inp,
  busyKey,
  saveSpecialist,
  onOwnerPhotoUpload,
}: {
  site: AdminSitePayload;
  setSite: Dispatch<SetStateAction<AdminSitePayload>>;
  inp: CSSProperties;
  busyKey: string;
  saveSpecialist: () => void;
  onOwnerPhotoUpload: (file: File | null) => void;
}) {
  return (
    <AdminSection
      title="Специалист"
      action={
        <button
          type="button"
          onClick={saveSpecialist}
          style={{
            ...ADMIN_COMPACT_SAVE_BTN,
            opacity: busyKey === 'specialist' ? 0.7 : 1,
            cursor: busyKey === 'specialist' ? 'wait' : 'pointer',
          }}
          disabled={busyKey === 'specialist'}
        >
          {busyKey === 'specialist' ? 'Запазване…' : 'Запази'}
        </button>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <SpecialistPhotoUpload
          photoUrl={site.ownerPublicPhotoUrl}
          busy={busyKey === 'upload-owner'}
          onUpload={onOwnerPhotoUpload}
        />
      </div>
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
    </AdminSection>
  );
}
