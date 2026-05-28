'use client';

import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { AddressAutocompleteField } from '@/components/admin/address-autocomplete-field';
import { adminGrid2 } from '@/components/admin/admin-theme';
import { AdminField, AdminSection } from '@/components/admin/admin-ui';
import { SalonFaqVisitorFields } from '@/components/admin/salon-faq-visitor-fields';
import type { AdminSitePayload } from '@/lib/admin-site';

export function SiteTabPanel({
  site,
  setSite,
  inp,
  btn,
  busyKey,
  saveSiteSettings,
}: {
  site: AdminSitePayload;
  setSite: Dispatch<SetStateAction<AdminSitePayload>>;
  inp: CSSProperties;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  busyKey: string;
  saveSiteSettings: () => void;
}) {
  return (
    <AdminSection
      title="Сайт"
      desc="Основна информация, показвана в публичната страница."
      action={
        <button type="button" onClick={saveSiteSettings} style={btn('primary')} disabled={busyKey === 'site'}>
          {busyKey === 'site' ? 'Запазваме…' : 'Запази'}
        </button>
      }
    >
      <div style={adminGrid2}>
        <AdminField label="Име на салона">
          <input value={site.name} onChange={(e) => setSite((p) => ({ ...p, name: e.target.value }))} style={inp} />
        </AdminField>
        <AdminField label="Категория">
          <input value={site.category} onChange={(e) => setSite((p) => ({ ...p, category: e.target.value }))} style={inp} />
        </AdminField>
        <AdminField label="Телефон">
          <input value={site.phone} onChange={(e) => setSite((p) => ({ ...p, phone: e.target.value }))} style={inp} />
        </AdminField>
        <AdminField label="Имейл">
          <input value={site.email} readOnly style={{ ...inp, color: '#71717A', cursor: 'default' }} />
        </AdminField>
        <AdminField label="Град">
          <input value={site.city} onChange={(e) => setSite((p) => ({ ...p, city: e.target.value }))} style={inp} />
        </AdminField>
        <AddressAutocompleteField
          label="Адрес"
          value={site.address}
          inputStyle={inp}
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
        <AdminField label="Instagram">
          <input value={site.instagram} onChange={(e) => setSite((p) => ({ ...p, instagram: e.target.value }))} style={inp} />
        </AdminField>
        <AdminField label="Facebook">
          <input value={site.facebook} onChange={(e) => setSite((p) => ({ ...p, facebook: e.target.value }))} style={inp} />
        </AdminField>
        <AdminField label="TikTok">
          <input value={site.tiktok} onChange={(e) => setSite((p) => ({ ...p, tiktok: e.target.value }))} style={inp} />
        </AdminField>
      </div>
      <div style={{ marginTop: 12 }}>
        <AdminField label="За салона">
          <textarea
            value={site.about}
            onChange={(e) => setSite((p) => ({ ...p, about: e.target.value }))}
            style={{ ...inp, minHeight: 120, resize: 'vertical', lineHeight: 1.6 }}
          />
        </AdminField>
      </div>
      <SalonFaqVisitorFields
        faqItems={site.faqItems}
        visitorInfo={site.visitorInfo}
        visitorAdditionalInfo={site.visitorAdditionalInfo}
        inputStyle={inp}
        onChangeFaq={(faqItems) => setSite((p) => ({ ...p, faqItems }))}
        onChangeVisitorInfo={(visitorInfo) => setSite((p) => ({ ...p, visitorInfo }))}
        onChangeAdditionalInfo={(visitorAdditionalInfo) => setSite((p) => ({ ...p, visitorAdditionalInfo }))}
      />
    </AdminSection>
  );
}
