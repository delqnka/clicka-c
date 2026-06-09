'use client';

import { useState, useEffect, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { AddressAutocompleteField } from '@/components/admin/address-autocomplete-field';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField, AdminSaveBtn, AdminSection } from '@/components/admin/admin-ui';
import { SalonFaqVisitorFields } from '@/components/admin/salon-faq-visitor-fields';
import { SlugEditor } from '@/components/admin/SlugEditor';
import type { AdminSitePayload } from '@/lib/admin-site';

const SITE_SECTIONS = [
  { id: 'basics', label: 'Контакти', mobileLabel: 'Контакти' },
  { id: 'address', label: 'WWW.', mobileLabel: 'Адрес / WWW' },
  { id: 'about', label: 'За салона', mobileLabel: 'За салона' },
  { id: 'faq', label: 'FAQ', mobileLabel: 'FAQ' },
  { id: 'amenities', label: 'Допълнителна', mobileLabel: 'Доп. информация' },
] as const;

const ACTIVE_GRADIENT = 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)';

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
    color: active ? '#e11d48' : ADMIN_T.muted,
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
  onNavigateToDomain,
  initialSection,
  siteNavVersion,
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
  onNavigateToDomain?: (intent: 'connect' | 'buy') => void;
  initialSection?: SiteSectionId;
  siteNavVersion?: number;
}) {
  const [section, setSection] = useState<SiteSectionId>(initialSection ?? 'basics');
  useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection, siteNavVersion]);
  const fieldInp: CSSProperties = { ...inp, padding: '7px 10px', fontSize: 14 };

  return (
    <AdminSection
      compact
      title="Сайт"
      action={
        <AdminSaveBtn
          label="Запази"
          busy={busyKey === 'site'}
          mobile={isMobile}
          green
          compact
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
          {SITE_SECTIONS.map(({ id, label, mobileLabel }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                style={siteSectionTabStyle(active, true)}
              >
                {mobileLabel || label}
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
          {SITE_SECTIONS.map(({ id, label }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                style={siteSectionTabStyle(active, false)}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {section === 'basics' ? (
        <div style={compactGrid}>
          <AdminField compact label="Име на салона">
            <input value={site.name} onChange={(e) => setSite((p) => ({ ...p, name: e.target.value }))} style={fieldInp} />
          </AdminField>
          <AdminField compact label="Категория">
            <input value={site.category} onChange={(e) => setSite((p) => ({ ...p, category: e.target.value }))} style={fieldInp} />
          </AdminField>
          <AdminField compact label="Телефон">
            <input value={site.phone} onChange={(e) => setSite((p) => ({ ...p, phone: e.target.value }))} style={fieldInp} type="tel" inputMode="tel" />
          </AdminField>
          <AdminField compact label="Имейл">
            <input value={site.email} readOnly style={{ ...fieldInp, color: '#71717A', cursor: 'default' }} />
          </AdminField>
          <AdminField compact label="Град">
            <input value={site.city} onChange={(e) => setSite((p) => ({ ...p, city: e.target.value }))} style={fieldInp} />
          </AdminField>
          <div style={{ display: 'grid', gap: 4 }}>
            <AddressAutocompleteField
              label="Адрес"
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
                href={`https://maps.apple.com/?ll=${site.latitude},${site.longitude}&q=${encodeURIComponent(site.address || 'Локация')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#007AFF', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Виж в Apple Maps
              </a>
            ) : null}
          </div>
          <AdminField compact label="Instagram">
            <input value={site.instagram} onChange={(e) => setSite((p) => ({ ...p, instagram: e.target.value }))} placeholder="salonnaprimer" style={fieldInp} />
          </AdminField>
          <AdminField compact label="Facebook">
            <input value={site.facebook} onChange={(e) => setSite((p) => ({ ...p, facebook: e.target.value }))} placeholder="salonnaprimer" style={fieldInp} />
          </AdminField>
          <AdminField compact label="TikTok">
            <input value={site.tiktok} onChange={(e) => setSite((p) => ({ ...p, tiktok: e.target.value }))} placeholder="salonnaprimer" style={fieldInp} />
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
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#047857' }}>Свързан домейн</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#065f46' }}>{site.customDomain}</p>
              </div>
              {onNavigateToDomain && (
                <button
                  type="button"
                  onClick={() => onNavigateToDomain('connect')}
                  style={{ marginLeft: 'auto', border: 'none', background: 'none', fontSize: 12, color: '#047857', fontWeight: 600, cursor: 'pointer', flexShrink: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}
                >
                  Управлявай
                </button>
              )}
            </div>
          )}
          {onNavigateToDomain && !site.customDomain && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${ADMIN_T.border}` }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: ADMIN_T.text }}>
                Собствен домейн
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                {([
                  { intent: 'connect' as const, label: 'Имам домейн', desc: 'Свържи съществуващ домейн към сайта си.', icon: '🔗' },
                  { intent: 'buy' as const,     label: 'Нямам домейн', desc: 'Ние ще го регистрираме и свържем вместо теб.', icon: '🛒' },
                ] as const).map(({ intent, label, desc, icon }) => (
                  <button
                    key={intent}
                    type="button"
                    onClick={() => onNavigateToDomain(intent)}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = 'linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#e11d48,#db2777,#a855f7) border-box';
                      el.style.borderColor = 'transparent';
                      el.style.boxShadow = '0 2px 10px rgba(219,39,119,0.12)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = '#fff';
                      el.style.borderColor = ADMIN_T.border;
                      el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                    }}
                    style={{
                      textAlign: 'left', width: '100%', padding: '13px 15px',
                      border: `1px solid ${ADMIN_T.border}`, borderRadius: 12, cursor: 'pointer',
                      background: '#fff',
                      display: 'flex', alignItems: 'center', gap: 12,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      transition: 'box-shadow 150ms',
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: ADMIN_T.text }}>{label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: ADMIN_T.muted, lineHeight: 1.45 }}>{desc}</p>
                    </div>
                    <span style={{ color: ADMIN_T.subtle, fontSize: 16, flexShrink: 0 }}>›</span>
                  </button>
                ))}
                <div style={{ paddingLeft: 2 }}>
                  <a
                    href="https://namecheap.pxf.io/c/7383967/1632743/5618"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}
                  >
                    Купи сам от Namecheap ↗
                  </a>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: ADMIN_T.subtle, lineHeight: 1.4 }}>Важи за .com, .net и др. — не поддържа .bg домейни.</p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}


      {section === 'about' ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <AdminField compact label="За салона">
            <textarea
              value={site.about}
              onChange={(e) => setSite((p) => ({ ...p, about: e.target.value }))}
              style={{ ...fieldInp, minHeight: 96, resize: 'vertical', lineHeight: 1.5 }}
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
    </AdminSection>
  );
}
