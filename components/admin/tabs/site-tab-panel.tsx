'use client';

import { useState, useEffect, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { AddressAutocompleteField } from '@/components/admin/address-autocomplete-field';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField, AdminSaveBtn, AdminSection } from '@/components/admin/admin-ui';
import { SalonFaqVisitorFields } from '@/components/admin/salon-faq-visitor-fields';
import { SlugEditor } from '@/components/admin/SlugEditor';
import type { AdminSitePayload } from '@/lib/admin-site';

const SITE_SECTIONS = [
  { id: 'basics', label: 'Контакти' },
  { id: 'address', label: 'WWW.' },
  { id: 'about', label: 'За салона' },
  { id: 'faq', label: 'FAQ' },
  { id: 'amenities', label: 'Допълнителна' },
] as const;

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
  onNavigateToDomain?: () => void;
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
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          flexWrap: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          marginBottom: 12,
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
              style={{
                border: 'none',
                borderBottom: active ? '2px solid transparent' : '2px solid transparent',
                backgroundImage: active
                  ? 'linear-gradient(135deg,#e11d48,#db2777,#a855f7), linear-gradient(135deg,#e11d48,#db2777,#a855f7)'
                  : 'none',
                backgroundSize: active ? '100% 2px, 100%' : 'auto',
                backgroundPosition: active ? '0 100%, 0 0' : 'auto',
                backgroundRepeat: 'no-repeat',
                backgroundColor: 'transparent',
                WebkitBackgroundClip: active ? 'border-box, text' : undefined,
                backgroundClip: active ? 'border-box, text' : undefined,
                WebkitTextFillColor: active ? 'transparent' : undefined,
                color: active ? '#e11d48' : ADMIN_T.muted,
                padding: '4px 2px',
                marginRight: 14,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                borderRadius: 0,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

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
          <SlugEditor
            currentSlug={currentSlug}
            rootDomain={rootDomain}
            inp={inp}
            onSaved={onSlugSaved}
          />
          {onNavigateToDomain && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${ADMIN_T.border}`, textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: ADMIN_T.muted }}>
                Имаш собствен домейн (например <em>moisalon.com</em>)?
              </p>
              <button
                type="button"
                onClick={onNavigateToDomain}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)',
                  color: '#fff', border: 'none', borderRadius: 999,
                  padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Свържи своя домейн
              </button>
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
