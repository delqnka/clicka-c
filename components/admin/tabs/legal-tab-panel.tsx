'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminSection } from '@/components/admin/admin-ui';
import { isSalonCustomDomainLive, type LegalDocumentPath } from '@/lib/domain-routing';
import { LEGAL_DOCUMENT_LABELS } from '@/lib/legal-documents-shared';
import type { LegalInfoStored } from '@/lib/legal-custom-documents';
import type { AdminSitePayload } from '@/lib/admin-site';

const LegalCustomDocumentsEditor = dynamic(
  () => import('@/components/admin/legal-custom-documents-editor').then((m) => m.LegalCustomDocumentsEditor),
  { ssr: false }
);

export function LegalTabPanel({
  site,
  legalInfo,
  setLegalInfo,
  inp,
  btn,
  legalSaving,
  legalNotice,
  saveLegalInfo,
  publicSiteHost,
  legalDocLinks,
}: {
  site: AdminSitePayload;
  legalInfo: LegalInfoStored;
  setLegalInfo: Dispatch<SetStateAction<LegalInfoStored>>;
  inp: CSSProperties;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  legalSaving: boolean;
  legalNotice: string;
  saveLegalInfo: () => void | Promise<void>;
  publicSiteHost: string;
  legalDocLinks: { kind: LegalDocumentPath; url: string }[];
}) {
  return (
    <AdminSection
      title="Правни документи"
      desc="Попълни фирмените данни за автоматични шаблони или включи собствен текст за условия, GDPR и бисквитки."
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: ADMIN_T.muted, marginBottom: 4 }}>
            Официално наименование на фирмата
          </label>
          <input
            style={inp}
            value={legalInfo.companyName}
            onChange={(e) => setLegalInfo((p) => ({ ...p, companyName: e.target.value }))}
            placeholder="напр. Ню Лукс ООД"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: ADMIN_T.muted, marginBottom: 4 }}>
            ЕИК / Булстат
          </label>
          <input
            style={inp}
            value={legalInfo.eik}
            onChange={(e) => setLegalInfo((p) => ({ ...p, eik: e.target.value }))}
            placeholder="напр. 123456789"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: ADMIN_T.muted, marginBottom: 4 }}>
            МОЛ (материалноотговорно лице / управител)
          </label>
          <input
            style={inp}
            value={legalInfo.managerName}
            onChange={(e) => setLegalInfo((p) => ({ ...p, managerName: e.target.value }))}
            placeholder="напр. Деляна Иванова"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: ADMIN_T.muted, marginBottom: 4 }}>
            Адрес на управление
          </label>
          <input
            style={inp}
            value={legalInfo.address}
            onChange={(e) => setLegalInfo((p) => ({ ...p, address: e.target.value }))}
            placeholder="напр. гр. София, ул. Витоша 1"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: ADMIN_T.muted, marginBottom: 4 }}>
            Имейл за връзка (за правни документи)
          </label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            style={inp}
            value={legalInfo.contactEmail}
            onChange={(e) => setLegalInfo((p) => ({ ...p, contactEmail: e.target.value }))}
            placeholder="напр. info@salon.bg"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <button type="button" onClick={() => void saveLegalInfo()} disabled={legalSaving} style={{ ...btn('primary'), opacity: legalSaving ? 0.6 : 1 }}>
            {legalSaving ? 'Запазване…' : 'Запази'}
          </button>
          {legalNotice ? (
            <span style={{ fontSize: 13, color: legalNotice.includes('Грешка') ? '#EF4444' : '#047857' }}>{legalNotice}</span>
          ) : null}
        </div>
        <div style={{ padding: '12px 14px', borderRadius: ADMIN_T.radiusSm, background: '#F4F4F5', marginTop: 4 }}>
          <p style={{ margin: 0, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.6 }}>
            След запазване документите са публични на <strong style={{ color: ADMIN_T.text }}>{publicSiteHost}</strong>
            {isSalonCustomDomainLive(site.domainStatus) ? ' (свързаният ти домейн)' : ''}:
          </p>
          <ul style={{ margin: '8px 0 0', paddingLeft: 0, listStyle: 'none', fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.85 }}>
            {legalDocLinks.map(({ kind, url }) => (
              <li key={kind}>
                <a href={url} target="_blank" rel="noreferrer" style={{ color: ADMIN_T.accent, fontWeight: 500, wordBreak: 'break-all' }}>
                  {url}
                </a>
                <span style={{ color: ADMIN_T.subtle }}> — {LEGAL_DOCUMENT_LABELS[kind]}</span>
              </li>
            ))}
          </ul>
        </div>
        <LegalCustomDocumentsEditor
          value={legalInfo.customDocuments}
          inputStyle={inp}
          onChange={(customDocuments) => setLegalInfo((p) => ({ ...p, customDocuments }))}
        />
      </div>
    </AdminSection>
  );
}
