'use client';

import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { ImagePlus, RefreshCw, UserRound } from 'lucide-react';
import { adminGrid2, ADMIN_COMPACT_SAVE_BTN, ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField, AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';
import { type Locale } from '@/lib/i18n';

function SpecialistPhotoUpload({
  photoUrl,
  busy,
  onUpload,
  locale,
}: {
  photoUrl: string;
  busy: boolean;
  onUpload: (file: File | null) => void;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  return (
    <div style={{ display: 'inline-flex', position: 'relative' }}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={isEn ? 'Specialist' : 'Специалист'}
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
        aria-label={isEn ? 'Upload specialist photo' : 'Качи снимка на специалиста'}
        title={isEn ? 'Upload photo' : 'Качи снимка'}
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
  locale,
}: {
  site: AdminSitePayload;
  setSite: Dispatch<SetStateAction<AdminSitePayload>>;
  inp: CSSProperties;
  busyKey: string;
  saveSpecialist: () => void;
  onOwnerPhotoUpload: (file: File | null) => void;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  return (
    <AdminSection
      title={isEn ? 'Specialist' : 'Специалист'}
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
          {busyKey === 'specialist' ? (isEn ? 'Saving…' : 'Запазване…') : (isEn ? 'Save' : 'Запази')}
        </button>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <SpecialistPhotoUpload
          photoUrl={site.ownerPublicPhotoUrl}
          busy={busyKey === 'upload-owner'}
          onUpload={onOwnerPhotoUpload}
          locale={locale}
        />
      </div>
      <div style={adminGrid2}>
        <AdminField label={isEn ? 'Name' : 'Име'}>
          <input value={site.ownerName} onChange={(e) => setSite((p) => ({ ...p, ownerName: e.target.value }))} style={inp} />
        </AdminField>
        <AdminField label={isEn ? 'Role' : 'Роля'}>
          <input
            value={site.ownerPublicRole}
            onChange={(e) => setSite((p) => ({ ...p, ownerPublicRole: e.target.value }))}
            style={inp}
          />
        </AdminField>
      </div>
      <div style={{ marginTop: 12 }}>
        <AdminField label="Bio">
          <textarea
            value={site.ownerPublicBio}
            onChange={(e) => setSite((p) => ({ ...p, ownerPublicBio: e.target.value }))}
            style={{ ...inp, minHeight: 96, resize: 'vertical' }}
            placeholder={isEn ? 'Short specialist introduction...' : 'Кратко представяне на специалиста...'}
          />
        </AdminField>
      </div>
    </AdminSection>
  );
}
