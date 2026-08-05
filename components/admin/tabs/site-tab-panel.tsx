'use client';

import { useState, useEffect, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { AddressAutocompleteField } from '@/components/admin/address-autocomplete-field';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField, AdminSaveBtn, AdminSection } from '@/components/admin/admin-ui';
import { SalonFaqVisitorFields } from '@/components/admin/salon-faq-visitor-fields';
import { SlugEditor } from '@/components/admin/SlugEditor';
import type { AdminSitePayload } from '@/lib/admin-site';
import { getT, type Locale } from '@/lib/i18n';
import type {
  SiteContent,
  SiteContentBenefitItem,
  SiteContentPriceItem,
} from '@/lib/site-content';

const SITE_SECTIONS = [
  { id: 'basics', labelKey: 'adminDashboard.siteTab.sections.basics', mobileLabelKey: 'adminDashboard.siteTab.sections.basics' },
  { id: 'address', labelKey: 'adminDashboard.siteTab.sections.address', mobileLabelKey: 'adminDashboard.siteTab.sections.addressMobile' },
  { id: 'about', labelKey: 'adminDashboard.siteTab.sections.about', mobileLabelKey: 'adminDashboard.siteTab.sections.about' },
  { id: 'content', labelKey: 'adminDashboard.siteTab.sections.content', mobileLabelKey: 'adminDashboard.siteTab.sections.content' },
  { id: 'faq', labelKey: 'adminDashboard.siteTab.sections.faq', mobileLabelKey: 'adminDashboard.siteTab.sections.faq' },
  { id: 'amenities', labelKey: 'adminDashboard.siteTab.sections.amenities', mobileLabelKey: 'adminDashboard.siteTab.sections.amenitiesMobile' },
] as const;

const ACTIVE_GRADIENT = '#000';

function siteSectionTabStyle(active: boolean, mobile: boolean): CSSProperties {
  if (mobile) {
    return {
      flexShrink: 0,
      whiteSpace: 'nowrap',
      border: active ? '1px solid #18181B' : `1px solid ${ADMIN_T.border}`,
      borderRadius: 999,
      padding: '5px 14px',
      fontSize: 13,
      fontWeight: active ? 600 : 400,
      lineHeight: 1.4,
      background: active ? '#18181B' : 'transparent',
      color: active ? '#fff' : ADMIN_T.muted,
      cursor: 'pointer',
      WebkitTapHighlightColor: 'transparent',
    };
  }

  return {
    border: 'none',
    borderBottom: '2px solid transparent',
    backgroundImage: active
      ? `${ACTIVE_GRADIENT}, ${ACTIVE_GRADIENT}`
      : 'none',
    backgroundSize: active ? '100% 2px, 100%' : 'auto',
    backgroundPosition: active ? '0 100%, 0 0' : 'auto',
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'transparent',
    WebkitBackgroundClip: active ? 'border-box, text' : undefined,
    backgroundClip: active ? 'border-box, text' : undefined,
    WebkitTextFillColor: active ? 'transparent' : undefined,
    color: active ? '#000' : ADMIN_T.muted,
    padding: '8px 12px',
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    borderRadius: 0,
  };
}

type SiteSectionId = (typeof SITE_SECTIONS)[number]['id'];

const compactGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
  gap: 8,
};

const sectionCardStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
  padding: 14,
  border: `1px solid ${ADMIN_T.border}`,
  borderRadius: 14,
  background: '#fff',
};

const itemRowStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  padding: 12,
  border: `1px solid ${ADMIN_T.border}`,
  borderRadius: 12,
  background: '#fafafa',
};

function updateSiteContent(
  setSite: Dispatch<SetStateAction<AdminSitePayload>>,
  updater: (prev: SiteContent) => SiteContent,
) {
  setSite((prev) => ({
    ...prev,
    siteContent: updater(prev.siteContent),
  }));
}

function StringListEditor({
  label,
  items,
  inputStyle,
  onChange,
}: {
  label: string;
  items: string[];
  inputStyle: CSSProperties;
  onChange: (items: string[]) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.muted }}>{label}</p>
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          style={{ border: `1px solid ${ADMIN_T.border}`, borderRadius: 999, background: '#fff', padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
        >
          + Добави
        </button>
      </div>
      {items.map((item, index) => (
        <div key={`${label}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <input
            value={item}
            onChange={(e) => onChange(items.map((row, rowIndex) => (rowIndex === index ? e.target.value : row)))}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, rowIndex) => rowIndex !== index))}
            style={{ border: `1px solid ${ADMIN_T.border}`, borderRadius: 10, background: '#fff', padding: '0 10px', fontSize: 12, cursor: 'pointer' }}
          >
            Изтрий
          </button>
        </div>
      ))}
    </div>
  );
}

function BenefitItemsEditor({
  items,
  inputStyle,
  onChange,
}: {
  items: SiteContentBenefitItem[];
  inputStyle: CSSProperties;
  onChange: (items: SiteContentBenefitItem[]) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.muted }}>Ползи</p>
        <button
          type="button"
          onClick={() => onChange([...items, { id: `benefit-${Date.now()}`, title: '', text: '' }])}
          style={{ border: `1px solid ${ADMIN_T.border}`, borderRadius: 999, background: '#fff', padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
        >
          + Добави полза
        </button>
      </div>
      {items.map((item, index) => (
        <div key={item.id || `benefit-${index}`} style={itemRowStyle}>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr auto' }}>
            <input
              value={item.title}
              onChange={(e) =>
                onChange(items.map((row, rowIndex) => (rowIndex === index ? { ...row, title: e.target.value } : row)))
              }
              placeholder="Заглавие"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, rowIndex) => rowIndex !== index))}
              style={{ border: `1px solid ${ADMIN_T.border}`, borderRadius: 10, background: '#fff', padding: '0 10px', fontSize: 12, cursor: 'pointer' }}
            >
              Изтрий
            </button>
          </div>
          <textarea
            value={item.text}
            onChange={(e) =>
              onChange(items.map((row, rowIndex) => (rowIndex === index ? { ...row, text: e.target.value } : row)))
            }
            placeholder="Кратко описание"
            style={{ ...inputStyle, minHeight: 84, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>
      ))}
    </div>
  );
}

function PriceItemsEditor({
  items,
  inputStyle,
  onChange,
}: {
  items: SiteContentPriceItem[];
  inputStyle: CSSProperties;
  onChange: (items: SiteContentPriceItem[]) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.muted }}>Цени и пакети</p>
        <button
          type="button"
          onClick={() => onChange([...items, { id: `price-${Date.now()}`, name: '', price: '', text: '' }])}
          style={{ border: `1px solid ${ADMIN_T.border}`, borderRadius: 999, background: '#fff', padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
        >
          + Добави пакет
        </button>
      </div>
      {items.map((item, index) => (
        <div key={item.id || `price-${index}`} style={itemRowStyle}>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1.3fr 0.7fr auto' }}>
            <input
              value={item.name}
              onChange={(e) =>
                onChange(items.map((row, rowIndex) => (rowIndex === index ? { ...row, name: e.target.value } : row)))
              }
              placeholder="Име на пакет"
              style={inputStyle}
            />
            <input
              value={item.price}
              onChange={(e) =>
                onChange(items.map((row, rowIndex) => (rowIndex === index ? { ...row, price: e.target.value } : row)))
              }
              placeholder="Цена"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, rowIndex) => rowIndex !== index))}
              style={{ border: `1px solid ${ADMIN_T.border}`, borderRadius: 10, background: '#fff', padding: '0 10px', fontSize: 12, cursor: 'pointer' }}
            >
              Изтрий
            </button>
          </div>
          <textarea
            value={item.text}
            onChange={(e) =>
              onChange(items.map((row, rowIndex) => (rowIndex === index ? { ...row, text: e.target.value } : row)))
            }
            placeholder="Описание"
            style={{ ...inputStyle, minHeight: 84, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>
      ))}
    </div>
  );
}

export function SiteTabPanel({
  site,
  setSite,
  inp,
  busyKey,
  saveSiteSettings,
  isMobile,
  currentSlug,
  rootDomain,
  onSlugSaved,
  initialSection,
  siteNavVersion,
  locale,
}: {
  site: AdminSitePayload;
  setSite: Dispatch<SetStateAction<AdminSitePayload>>;
  inp: CSSProperties;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  busyKey: string;
  saveSiteSettings: () => void;
  isMobile: boolean;
  currentSlug: string;
  rootDomain: string;
  onSlugSaved: (newSlug: string) => void;
  initialSection?: SiteSectionId;
  siteNavVersion?: number;
  locale: Locale;
}) {
  const t = getT(locale);
  const [section, setSection] = useState<SiteSectionId>(initialSection ?? 'basics');
  useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection, siteNavVersion]);
  const fieldInp: CSSProperties = { ...inp, padding: '7px 10px', fontSize: 14 };

  return (
    <AdminSection
      compact
      title={t('adminDashboard.tabs.site')}
      action={
        <AdminSaveBtn
          label={t('adminDashboard.actions.save')}
          busy={busyKey === 'site'}
          mobile={isMobile}
          green
          compact
          locale={locale}
          onClick={saveSiteSettings}
        />
      }
    >
      {isMobile ? (
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            flexWrap: 'nowrap',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            marginBottom: 14,
          }}
        >
          {SITE_SECTIONS.map(({ id, labelKey, mobileLabelKey }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                style={siteSectionTabStyle(active, true)}
              >
                {t(mobileLabelKey ?? labelKey)}
              </button>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: 4,
            overflowX: 'auto',
            flexWrap: 'nowrap',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            marginBottom: 14,
            paddingBottom: 2,
          }}
        >
          {SITE_SECTIONS.map(({ id, labelKey }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                style={siteSectionTabStyle(active, false)}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      )}

      {section === 'basics' ? (
        <div style={compactGrid}>
          <AdminField compact label={t('adminDashboard.siteTab.fields.salonName')}>
            <input value={site.name} onChange={(e) => setSite((p) => ({ ...p, name: e.target.value }))} style={fieldInp} />
          </AdminField>
          <AdminField compact label={t('adminDashboard.siteTab.fields.phone')}>
            <input value={site.phone} onChange={(e) => setSite((p) => ({ ...p, phone: e.target.value }))} style={fieldInp} type="tel" inputMode="tel" />
          </AdminField>
          <AdminField compact label={t('adminDashboard.siteTab.fields.email')}>
            <input value={site.email} readOnly style={{ ...fieldInp, color: '#71717A', cursor: 'default' }} />
          </AdminField>
          <AdminField compact label={t('adminDashboard.siteTab.fields.city')}>
            <input value={site.city} onChange={(e) => setSite((p) => ({ ...p, city: e.target.value }))} style={fieldInp} />
          </AdminField>
          <AdminField compact label={t('adminDashboard.siteTab.fields.language')}>
            <select
              value={site.language}
              onChange={(e) => setSite((p) => ({ ...p, language: e.target.value === 'en' ? 'en' : 'bg' }))}
              style={fieldInp}
            >
              <option value="bg">{t('adminDashboard.siteTab.languageOptions.bg')}</option>
              <option value="en">{t('adminDashboard.siteTab.languageOptions.en')}</option>
            </select>
          </AdminField>
          <div style={{ display: 'grid', gap: 4 }}>
            <AddressAutocompleteField
              label={t('adminDashboard.siteTab.fields.address')}
              value={site.address}
              inputStyle={fieldInp}
              onChange={(address) => setSite((p) => ({ ...p, address }))}
              onSelect={({ address, city, lat, lng, googleMapsUrl }) =>
                setSite((p) => ({
                  ...p,
                  address,
                  city: city || p.city,
                  latitude: lat,
                  longitude: lng,
                  googleMapsUrl,
                }))
              }
            />
            {site.latitude && site.longitude ? (
              <a
                  href={`https://maps.apple.com/?ll=${site.latitude},${site.longitude}&q=${encodeURIComponent(site.address || t('adminDashboard.siteTab.locationFallback'))}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#007AFF', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {t('adminDashboard.siteTab.viewAppleMaps')}
              </a>
            ) : null}
          </div>
          <AdminField compact label="Instagram">
            <input value={site.instagram} onChange={(e) => setSite((p) => ({ ...p, instagram: e.target.value }))} placeholder={t('adminDashboard.siteTab.socialPlaceholder')} style={fieldInp} />
          </AdminField>
          <AdminField compact label="Facebook">
            <input value={site.facebook} onChange={(e) => setSite((p) => ({ ...p, facebook: e.target.value }))} placeholder={t('adminDashboard.siteTab.socialPlaceholder')} style={fieldInp} />
          </AdminField>
          <AdminField compact label="TikTok">
            <input value={site.tiktok} onChange={(e) => setSite((p) => ({ ...p, tiktok: e.target.value }))} placeholder={t('adminDashboard.siteTab.socialPlaceholder')} style={fieldInp} />
          </AdminField>
        </div>
      ) : null}

      {section === 'address' ? (
        <>
          {!site.customDomain && (
            <SlugEditor
              currentSlug={currentSlug}
              rootDomain={rootDomain}
              inp={inp}
              onSaved={onSlugSaved}
            />
          )}
          {site.customDomain && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: '#f0fdf4', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>✓</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#047857' }}>{t('adminDashboard.siteTab.connectedDomain')}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#065f46' }}>{site.customDomain}</p>
              </div>
            </div>
          )}
        </>
      ) : null}


      {section === 'about' ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <AdminField compact label={t('adminDashboard.siteTab.fields.heroTitle')}>
            <input
              value={site.heroTitle}
              onChange={(e) => setSite((p) => ({ ...p, heroTitle: e.target.value }))}
              placeholder={site.name}
              style={fieldInp}
            />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: ADMIN_T.muted, lineHeight: 1.4 }}>
              {t('adminDashboard.siteTab.fields.heroTitleHint')}
            </p>
          </AdminField>
          <AdminField compact label={t('adminDashboard.siteTab.fields.heroSubtitle')}>
            <input
              value={site.heroSubtitle}
              onChange={(e) => setSite((p) => ({ ...p, heroSubtitle: e.target.value }))}
              style={fieldInp}
            />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: ADMIN_T.muted, lineHeight: 1.4 }}>
              {t('adminDashboard.siteTab.fields.heroSubtitleHint')}
            </p>
          </AdminField>
          <AdminField compact label={t('adminDashboard.siteTab.sections.about')}>
            <textarea
              value={site.about}
              onChange={(e) => setSite((p) => ({ ...p, about: e.target.value }))}
              style={{ ...fieldInp, minHeight: 180, resize: 'vertical', lineHeight: 1.5 }}
            />
          </AdminField>
          <SalonFaqVisitorFields
            section="additional"
            compact
            faqItems={site.faqItems}
            visitorInfo={site.visitorInfo}
            visitorAdditionalInfo={site.visitorAdditionalInfo}
            venueExtras={site.venueExtras}
            inputStyle={fieldInp}
            onChangeFaq={(faqItems) => setSite((p) => ({ ...p, faqItems }))}
            onChangeVisitorInfo={(visitorInfo) => setSite((p) => ({ ...p, visitorInfo }))}
            onChangeAdditionalInfo={(visitorAdditionalInfo) => setSite((p) => ({ ...p, visitorAdditionalInfo }))}
            onChangeVenueExtras={(venueExtras) => setSite((p) => ({ ...p, venueExtras }))}
          />
        </div>
      ) : null}

      {section === 'content' ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={sectionCardStyle}>
            <p style={{ margin: 0, fontSize: 13, color: '#111827' }}>Reformer Pilates</p>
            <AdminField compact label="Заглавие">
              <input
                value={site.siteContent.reformer.title}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, reformer: { ...prev.reformer, title: e.target.value } }))}
                style={fieldInp}
              />
            </AdminField>
            <AdminField compact label="Подзаглавие">
              <input
                value={site.siteContent.reformer.subtitle}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, reformer: { ...prev.reformer, subtitle: e.target.value } }))}
                style={fieldInp}
              />
            </AdminField>
            <AdminField compact label="Описание">
              <textarea
                value={site.siteContent.reformer.body}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, reformer: { ...prev.reformer, body: e.target.value } }))}
                style={{ ...fieldInp, minHeight: 120, resize: 'vertical', lineHeight: 1.5 }}
              />
            </AdminField>
          </div>

          <div style={sectionCardStyle}>
            <p style={{ margin: 0, fontSize: 13, color: '#111827' }}>Ползи</p>
            <AdminField compact label="Заглавие">
              <input
                value={site.siteContent.benefits.title}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, benefits: { ...prev.benefits, title: e.target.value } }))}
                style={fieldInp}
              />
            </AdminField>
            <AdminField compact label="Увод">
              <textarea
                value={site.siteContent.benefits.intro}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, benefits: { ...prev.benefits, intro: e.target.value } }))}
                style={{ ...fieldInp, minHeight: 84, resize: 'vertical', lineHeight: 1.5 }}
              />
            </AdminField>
            <BenefitItemsEditor
              items={site.siteContent.benefits.items}
              inputStyle={fieldInp}
              onChange={(items) => updateSiteContent(setSite, (prev) => ({ ...prev, benefits: { ...prev.benefits, items } }))}
            />
          </div>

          <div style={sectionCardStyle}>
            <p style={{ margin: 0, fontSize: 13, color: '#111827' }}>За кого е подходящ</p>
            <AdminField compact label="Заглавие">
              <input
                value={site.siteContent.audience.title}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, audience: { ...prev.audience, title: e.target.value } }))}
                style={fieldInp}
              />
            </AdminField>
            <AdminField compact label="Увод">
              <textarea
                value={site.siteContent.audience.intro}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, audience: { ...prev.audience, intro: e.target.value } }))}
                style={{ ...fieldInp, minHeight: 84, resize: 'vertical', lineHeight: 1.5 }}
              />
            </AdminField>
            <StringListEditor
              label="Подходящо за"
              items={site.siteContent.audience.items}
              inputStyle={fieldInp}
              onChange={(items) => updateSiteContent(setSite, (prev) => ({ ...prev, audience: { ...prev.audience, items } }))}
            />
            <AdminField compact label="Заключение">
              <textarea
                value={site.siteContent.audience.outro}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, audience: { ...prev.audience, outro: e.target.value } }))}
                style={{ ...fieldInp, minHeight: 84, resize: 'vertical', lineHeight: 1.5 }}
              />
            </AdminField>
          </div>

          <div style={sectionCardStyle}>
            <p style={{ margin: 0, fontSize: 13, color: '#111827' }}>Защо да изберат вас</p>
            <AdminField compact label="Заглавие">
              <input
                value={site.siteContent.whyChooseUs.title}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, whyChooseUs: { ...prev.whyChooseUs, title: e.target.value } }))}
                style={fieldInp}
              />
            </AdminField>
            <AdminField compact label="Увод">
              <textarea
                value={site.siteContent.whyChooseUs.intro}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, whyChooseUs: { ...prev.whyChooseUs, intro: e.target.value } }))}
                style={{ ...fieldInp, minHeight: 84, resize: 'vertical', lineHeight: 1.5 }}
              />
            </AdminField>
            <StringListEditor
              label="Причини"
              items={site.siteContent.whyChooseUs.items}
              inputStyle={fieldInp}
              onChange={(items) => updateSiteContent(setSite, (prev) => ({ ...prev, whyChooseUs: { ...prev.whyChooseUs, items } }))}
            />
            <AdminField compact label="Заключение">
              <textarea
                value={site.siteContent.whyChooseUs.outro}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, whyChooseUs: { ...prev.whyChooseUs, outro: e.target.value } }))}
                style={{ ...fieldInp, minHeight: 84, resize: 'vertical', lineHeight: 1.5 }}
              />
            </AdminField>
          </div>

          <div style={sectionCardStyle}>
            <p style={{ margin: 0, fontSize: 13, color: '#111827' }}>Цени и пакети</p>
            <AdminField compact label="Заглавие">
              <input
                value={site.siteContent.pricing.title}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, pricing: { ...prev.pricing, title: e.target.value } }))}
                style={fieldInp}
              />
            </AdminField>
            <AdminField compact label="Увод">
              <textarea
                value={site.siteContent.pricing.intro}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, pricing: { ...prev.pricing, intro: e.target.value } }))}
                style={{ ...fieldInp, minHeight: 84, resize: 'vertical', lineHeight: 1.5 }}
              />
            </AdminField>
            <PriceItemsEditor
              items={site.siteContent.pricing.items}
              inputStyle={fieldInp}
              onChange={(items) => updateSiteContent(setSite, (prev) => ({ ...prev, pricing: { ...prev.pricing, items } }))}
            />
            <AdminField compact label="Бележка">
              <textarea
                value={site.siteContent.pricing.note}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, pricing: { ...prev.pricing, note: e.target.value } }))}
                style={{ ...fieldInp, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }}
              />
            </AdminField>
          </div>

          <div style={sectionCardStyle}>
            <p style={{ margin: 0, fontSize: 13, color: '#111827' }}>Инструктори</p>
            <AdminField compact label="Заглавие">
              <input
                value={site.siteContent.instructors.title}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, instructors: { ...prev.instructors, title: e.target.value } }))}
                style={fieldInp}
              />
            </AdminField>
            <AdminField compact label="Подзаглавие">
              <input
                value={site.siteContent.instructors.subtitle}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, instructors: { ...prev.instructors, subtitle: e.target.value } }))}
                style={fieldInp}
              />
            </AdminField>
            <AdminField compact label="Описание">
              <textarea
                value={site.siteContent.instructors.body}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, instructors: { ...prev.instructors, body: e.target.value } }))}
                style={{ ...fieldInp, minHeight: 100, resize: 'vertical', lineHeight: 1.5 }}
              />
            </AdminField>
          </div>

          <div style={sectionCardStyle}>
            <p style={{ margin: 0, fontSize: 13, color: '#111827' }}>Галерия</p>
            <AdminField compact label="Заглавие">
              <input
                value={site.siteContent.gallery.title}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, gallery: { ...prev.gallery, title: e.target.value } }))}
                style={fieldInp}
              />
            </AdminField>
            <AdminField compact label="Подзаглавие">
              <input
                value={site.siteContent.gallery.subtitle}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, gallery: { ...prev.gallery, subtitle: e.target.value } }))}
                style={fieldInp}
              />
            </AdminField>
            <AdminField compact label="Описание">
              <textarea
                value={site.siteContent.gallery.body}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, gallery: { ...prev.gallery, body: e.target.value } }))}
                style={{ ...fieldInp, minHeight: 100, resize: 'vertical', lineHeight: 1.5 }}
              />
            </AdminField>
          </div>

          <div style={sectionCardStyle}>
            <p style={{ margin: 0, fontSize: 13, color: '#111827' }}>Контакти</p>
            <AdminField compact label="Заглавие">
              <input
                value={site.siteContent.contact.title}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, contact: { ...prev.contact, title: e.target.value } }))}
                style={fieldInp}
              />
            </AdminField>
            <AdminField compact label="Подзаглавие">
              <input
                value={site.siteContent.contact.subtitle}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, contact: { ...prev.contact, subtitle: e.target.value } }))}
                style={fieldInp}
              />
            </AdminField>
            <AdminField compact label="Описание">
              <textarea
                value={site.siteContent.contact.body}
                onChange={(e) => updateSiteContent(setSite, (prev) => ({ ...prev, contact: { ...prev.contact, body: e.target.value } }))}
                style={{ ...fieldInp, minHeight: 100, resize: 'vertical', lineHeight: 1.5 }}
              />
            </AdminField>
          </div>
        </div>
      ) : null}

      {section === 'faq' ? (
        <SalonFaqVisitorFields
          section="faq"
          compact
          faqItems={site.faqItems}
          visitorInfo={site.visitorInfo}
          visitorAdditionalInfo={site.visitorAdditionalInfo}
          venueExtras={site.venueExtras}
          inputStyle={fieldInp}
          onChangeFaq={(faqItems) => setSite((p) => ({ ...p, faqItems }))}
          onChangeVisitorInfo={(visitorInfo) => setSite((p) => ({ ...p, visitorInfo }))}
          onChangeAdditionalInfo={(visitorAdditionalInfo) => setSite((p) => ({ ...p, visitorAdditionalInfo }))}
          onChangeVenueExtras={(venueExtras) => setSite((p) => ({ ...p, venueExtras }))}
        />
      ) : null}

      {section === 'amenities' ? (
        <SalonFaqVisitorFields
          section="amenities"
          compact
          faqItems={site.faqItems}
          visitorInfo={site.visitorInfo}
          visitorAdditionalInfo={site.visitorAdditionalInfo}
          venueExtras={site.venueExtras}
          inputStyle={fieldInp}
          onChangeFaq={(faqItems) => setSite((p) => ({ ...p, faqItems }))}
          onChangeVisitorInfo={(visitorInfo) => setSite((p) => ({ ...p, visitorInfo }))}
          onChangeAdditionalInfo={(visitorAdditionalInfo) => setSite((p) => ({ ...p, visitorAdditionalInfo }))}
          onChangeVenueExtras={(venueExtras) => setSite((p) => ({ ...p, venueExtras }))}
        />
      ) : null}

      {isMobile ? (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            marginTop: 16,
            marginLeft: -12,
            marginRight: -12,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'saturate(180%) blur(10px)',
            WebkitBackdropFilter: 'saturate(180%) blur(10px)',
            borderTop: `1px solid ${ADMIN_T.border}`,
            zIndex: 20,
          }}
        >
          <AdminSaveBtn
            label={t('adminDashboard.actions.save')}
            busy={busyKey === 'site'}
            mobile
            green
            compact
            locale={locale}
            onClick={saveSiteSettings}
          />
        </div>
      ) : null}
    </AdminSection>
  );
}
