'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminSection } from '@/components/admin/admin-ui';
import { isSalonCustomDomainLive, type LegalDocumentPath } from '@/lib/domain-routing';
import { getLegalDocumentLabels } from '@/lib/legal-documents-shared';
import type { LegalInfoStored } from '@/lib/legal-custom-documents';
import type { AdminSitePayload } from '@/lib/admin-site';
import type { Locale } from '@/lib/i18n';

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
  locale = 'bg',
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
  locale?: Locale;
}) {
  const isEn = locale === 'en';
  const legalLabels = getLegalDocumentLabels(locale);
  return (
    <AdminSection
      title={isEn ? 'Legal documents' : 'Правни документи'}
      desc={isEn
        ? 'Fill in company details for auto-generated templates, or provide your own text for terms, GDPR, and cookies.'
        : 'Попълни фирмените данни за автоматични шаблони или включи собствен текст за условия, GDPR и бисквитки.'}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: ADMIN_T.muted, marginBottom: 4 }}>
            {isEn ? 'Official company name' : 'Официално наименование на фирмата'}
          </label>
          <input
            style={inp}
            value={legalInfo.companyName}
            onChange={(e) => setLegalInfo((p) => ({ ...p, companyName: e.target.value }))}
            placeholder={isEn ? 'e.g. New Look Ltd.' : 'напр. Ню Лукс ООД'}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: ADMIN_T.muted, marginBottom: 4 }}>
            {isEn ? 'Tax / Company ID' : 'ЕИК / Булстат'}
          </label>
          <input
            style={inp}
            value={legalInfo.eik}
            onChange={(e) => setLegalInfo((p) => ({ ...p, eik: e.target.value }))}
            placeholder={isEn ? 'e.g. 123456789' : 'напр. 123456789'}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: ADMIN_T.muted, marginBottom: 4 }}>
            {isEn ? 'Responsible person / manager' : 'МОЛ (материалноотговорно лице / управител)'}
          </label>
          <input
            style={inp}
            value={legalInfo.managerName}
            onChange={(e) => setLegalInfo((p) => ({ ...p, managerName: e.target.value }))}
            placeholder={isEn ? 'e.g. Jane Smith' : 'напр. Деляна Иванова'}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: ADMIN_T.muted, marginBottom: 4 }}>
            {isEn ? 'Registered address' : 'Адрес на управление'}
          </label>
          <input
            style={inp}
            value={legalInfo.address}
            onChange={(e) => setLegalInfo((p) => ({ ...p, address: e.target.value }))}
            placeholder={isEn ? 'e.g. 1 Main St, Sofia' : 'напр. гр. София, ул. Витоша 1'}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: ADMIN_T.muted, marginBottom: 4 }}>
            {isEn ? 'Contact email (for legal documents)' : 'Имейл за връзка (за правни документи)'}
          </label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            style={inp}
            value={legalInfo.contactEmail}
            onChange={(e) => setLegalInfo((p) => ({ ...p, contactEmail: e.target.value }))}
            placeholder={isEn ? 'e.g. info@salon.com' : 'напр. info@salon.bg'}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <button type="button" onClick={() => void saveLegalInfo()} disabled={legalSaving} style={{ ...btn('primary'), opacity: legalSaving ? 0.6 : 1 }}>
            {legalSaving ? (isEn ? 'Saving…' : 'Запазване…') : (isEn ? 'Save' : 'Запази')}
          </button>
          {legalNotice ? (
            <span style={{ fontSize: 13, color: legalNotice.includes('Грешка') || legalNotice.toLowerCase().includes('error') ? '#EF4444' : '#047857' }}>{legalNotice}</span>
          ) : null}
        </div>
        <div style={{ padding: '12px 14px', borderRadius: ADMIN_T.radiusSm, background: '#F4F4F5', marginTop: 4 }}>
          <p style={{ margin: 0, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.6 }}>
            {isEn ? 'After saving, the documents are public on ' : 'След запазване документите са публични на '}
            <strong style={{ color: ADMIN_T.text }}>{publicSiteHost}</strong>
            {isSalonCustomDomainLive(site.domainStatus) ? (isEn ? ' (your connected domain)' : ' (свързаният ти домейн)') : ''}:
          </p>
          <ul style={{ margin: '8px 0 0', paddingLeft: 0, listStyle: 'none', fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.85 }}>
            {legalDocLinks.map(({ kind, url }) => (
              <li key={kind}>
                <a href={url} target="_blank" rel="noreferrer" style={{ color: ADMIN_T.accent, fontWeight: 500, wordBreak: 'break-all' }}>
                  {url}
                </a>
                <span style={{ color: ADMIN_T.subtle }}> — {legalLabels[kind]}</span>
              </li>
            ))}
          </ul>
        </div>
        <LegalCustomDocumentsEditor
          value={legalInfo.customDocuments}
          inputStyle={inp}
          onChange={(customDocuments) => setLegalInfo((p) => ({ ...p, customDocuments }))}
          locale={locale}
        />
      </div>
    </AdminSection>
  );
}
