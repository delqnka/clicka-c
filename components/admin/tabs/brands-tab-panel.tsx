'use client';

import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { AdminSection, AdminSaveBtn } from '@/components/admin/admin-ui';
import { ALL_BRANDS, BRAND_CATEGORY_LABELS, type BrandCategory } from '@/lib/brands';

type Props = {
  initialBrandIds: string[];
  isMobile: boolean;
};

type CustomBrand = { name: string; domain: string };

const CUSTOM_PREFIX = 'custom|';

function encodeCustom(b: CustomBrand) {
  return `${CUSTOM_PREFIX}${b.name}|${b.domain}`;
}

function decodeCustom(raw: string): CustomBrand | null {
  if (!raw.startsWith(CUSTOM_PREFIX)) return null;
  const rest = raw.slice(CUSTOM_PREFIX.length);
  const idx = rest.indexOf('|');
  if (idx === -1) return null;
  return { name: rest.slice(0, idx), domain: rest.slice(idx + 1) };
}

function splitInitialIds(ids: string[]): { predefined: string[]; custom: CustomBrand[] } {
  const predefined: string[] = [];
  const custom: CustomBrand[] = [];
  for (const id of ids) {
    const c = decodeCustom(id);
    if (c) custom.push(c);
    else predefined.push(id);
  }
  return { predefined, custom };
}

export function BrandsTabPanel({ initialBrandIds, isMobile }: Props) {
  const init = splitInitialIds(initialBrandIds);
  const [selected, setSelected] = useState<Set<string>>(new Set(init.predefined));
  const [customBrands, setCustomBrands] = useState<CustomBrand[]>(init.custom);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const [customName, setCustomName] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [customError, setCustomError] = useState('');

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  }

  function addCustom() {
    const name = customName.trim();
    const domain = customDomain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!name) { setCustomError('Въведи име на бранда'); return; }
    if (!domain || !domain.includes('.')) { setCustomError('Въведи валиден домейн (пр. mybrand.com)'); return; }
    if (customBrands.some((b) => b.domain === domain)) { setCustomError('Този домейн вече е добавен'); return; }
    setCustomBrands((prev) => [...prev, { name, domain }]);
    setCustomName('');
    setCustomDomain('');
    setCustomError('');
    setSaved(false);
  }

  function removeCustom(domain: string) {
    setCustomBrands((prev) => prev.filter((b) => b.domain !== domain));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    try {
      const allIds = [
        ...selected,
        ...customBrands.map(encodeCustom),
      ];
      await fetch('/api/salons/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandIds: allIds }),
      });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  const categories = Object.keys(BRAND_CATEGORY_LABELS) as BrandCategory[];

  const font = { fontFamily: "'Manrope', sans-serif" };

  return (
    <AdminSection
      compact
      title="Брандове"
      action={
        <AdminSaveBtn
          label={saved ? 'Запазено ✓' : 'Запази'}
          busy={busy}
          mobile={isMobile}
          onClick={save}
        />
      }
    >
      <p style={{ fontSize: 13, color: '#888', marginBottom: 20, ...font }}>
        Избери брандовете, с които работиш. Логата им ще се показват на публичната ти страница.
      </p>

      {categories.map((cat) => {
        const brands = ALL_BRANDS.filter((b) => b.category === cat);
        return (
          <div key={cat} style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0f0f0f', marginBottom: 12, ...font }}>
              {BRAND_CATEGORY_LABELS[cat]}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {brands.map((brand) => {
                const isOn = selected.has(brand.id);
                return (
                  <button
                    key={brand.id}
                    onClick={() => toggle(brand.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: isOn ? '2px solid #0f0f0f' : '1.5px solid #e5e7eb',
                      background: isOn ? '#0f0f0f' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      ...font,
                    }}
                  >
                    {isOn && <Check size={11} color="#fff" strokeWidth={3} />}
                    <span style={{ fontSize: 12, fontWeight: 600, color: isOn ? '#fff' : '#0f0f0f', lineHeight: 1.3 }}>
                      {brand.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Custom brands */}
      <div style={{ marginTop: 8, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#0f0f0f', marginBottom: 12, ...font }}>
          Добави ръчно
        </p>

        {customBrands.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {customBrands.map((b) => (
              <div
                key={b.domain}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '2px solid #0f0f0f',
                  background: '#0f0f0f',
                  ...font,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
                  {b.name}
                </span>
                <button
                  onClick={() => removeCustom(b.domain)}
                  title="Премахни"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <X size={9} color="#fff" strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#888', ...font }}>Име на бранда</label>
            <input
              value={customName}
              onChange={(e) => { setCustomName(e.target.value); setCustomError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
              placeholder="пр. Londa Professional"
              style={{
                height: 36, padding: '0 10px', borderRadius: 8,
                border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none',
                width: isMobile ? '100%' : 180,
                ...font,
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#888', ...font }}>Домейн (за лого)</label>
            <input
              value={customDomain}
              onChange={(e) => { setCustomDomain(e.target.value); setCustomError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
              placeholder="пр. londa.com"
              style={{
                height: 36, padding: '0 10px', borderRadius: 8,
                border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none',
                width: isMobile ? '100%' : 160,
                ...font,
              }}
            />
          </div>
          <button
            onClick={addCustom}
            style={{
              height: 36, padding: '0 14px', borderRadius: 8,
              background: '#0f0f0f',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 600, color: '#fff',
              flexShrink: 0,
              ...font,
            }}
          >
            <Plus size={14} />
            Добави
          </button>
        </div>
        {customError && (
          <p style={{ fontSize: 12, color: '#e11d48', marginTop: 6, ...font }}>{customError}</p>
        )}
        <p style={{ fontSize: 11, color: '#bbb', marginTop: 8, lineHeight: 1.5, ...font }}>
          Домейнът се използва само за зареждане на логото (пр. за Londa — въведи <em>londa.com</em>).
        </p>
      </div>
    </AdminSection>
  );
}
