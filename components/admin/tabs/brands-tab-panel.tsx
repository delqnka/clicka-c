'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { AdminSection, AdminSaveBtn } from '@/components/admin/admin-ui';
import { ALL_BRANDS, BRAND_CATEGORY_LABELS, type BrandCategory } from '@/lib/brands';

type Props = {
  initialBrandIds: string[];
  isMobile: boolean;
};

function BrandLogo({ domain, name }: { domain: string; name: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        style={{
          width: 40, height: 40, borderRadius: 8,
          background: 'linear-gradient(135deg,#fdf2f8,#f5f3ff)',
          border: '1px solid #f0e6f6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#a855f7', textAlign: 'center',
          padding: 2, lineHeight: 1.2,
        }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={name}
      width={40}
      height={40}
      onError={() => setFailed(true)}
      style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8 }}
    />
  );
}

export function BrandsTabPanel({ initialBrandIds, isMobile }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialBrandIds));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    try {
      await fetch('/api/salons/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandIds: [...selected] }),
      });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  const categories = Object.keys(BRAND_CATEGORY_LABELS) as BrandCategory[];

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
      <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
        Избери брандовете, с които работиш. Логата им ще се показват на публичната ти страница.
      </p>

      {categories.map((cat) => {
        const brands = ALL_BRANDS.filter((b) => b.category === cat);
        return (
          <div key={cat} style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a855f7', marginBottom: 12 }}>
              {BRAND_CATEGORY_LABELS[cat]}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {brands.map((brand) => {
                const isOn = selected.has(brand.id);
                return (
                  <button
                    key={brand.id}
                    onClick={() => toggle(brand.id)}
                    title={brand.name}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px 6px 8px',
                      borderRadius: 10,
                      border: isOn ? '2px solid #a855f7' : '1.5px solid #e5e7eb',
                      background: isOn ? '#faf5ff' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                  >
                    <BrandLogo domain={brand.domain} name={brand.name} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: isOn ? '#7c3aed' : '#444', maxWidth: 100, textAlign: 'left', lineHeight: 1.3 }}>
                      {brand.name}
                    </span>
                    {isOn && (
                      <span style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 16, height: 16, borderRadius: '50%',
                        background: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={10} color="#fff" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </AdminSection>
  );
}
