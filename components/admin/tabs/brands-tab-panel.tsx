'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { AdminSection, AdminSaveBtn } from '@/components/admin/admin-ui';
import { ALL_BRANDS, BRAND_CATEGORY_LABELS, type BrandCategory } from '@/lib/brands';

type Props = {
  initialBrandIds: string[];
  isMobile: boolean;
};

const CUSTOM_PREFIX = 'custom|';

function encodeCustom(name: string) {
  return `${CUSTOM_PREFIX}${name}`;
}

function decodeCustomName(raw: string): string | null {
  if (!raw.startsWith(CUSTOM_PREFIX)) return null;
  const rest = raw.slice(CUSTOM_PREFIX.length);
  // backward compat: old format was custom|name|domain — take only the name part
  const pipeIdx = rest.indexOf('|');
  return pipeIdx === -1 ? rest : rest.slice(0, pipeIdx);
}

function splitInitialIds(ids: string[]): { predefined: string[]; customNames: string[] } {
  const predefined: string[] = [];
  const customNames: string[] = [];
  for (const id of ids) {
    const name = decodeCustomName(id);
    if (name) customNames.push(name);
    else predefined.push(id);
  }
  return { predefined, customNames };
}

export function BrandsTabPanel({ initialBrandIds, isMobile }: Props) {
  const init = splitInitialIds(initialBrandIds ?? []);
  const [selected, setSelected] = useState<Set<string>>(new Set(init.predefined));
  const [customNames, setCustomNames] = useState<string[]>(init.customNames);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customError, setCustomError] = useState('');
  const [openCats, setOpenCats] = useState<Set<BrandCategory>>(new Set());

  function toggleCat(cat: BrandCategory) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const font = { fontFamily: "'Manrope', sans-serif" };

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
    const name = customInput.trim();
    if (!name) { setCustomError('Въведи име на бранда'); return; }
    if (customNames.includes(name)) { setCustomError('Вече е добавен'); return; }
    setCustomNames((prev) => [...prev, name]);
    setCustomInput('');
    setCustomError('');
    setSaved(false);
  }

  function removeCustom(name: string) {
    setCustomNames((prev) => prev.filter((n) => n !== name));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    try {
      const allIds = [...selected, ...customNames.map(encodeCustom)];
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

  return (
    <div style={{ maxWidth: 560 }}>
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
      {/* Custom brands — най-горе */}
      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#0f0f0f', marginBottom: 12, ...font }}>
          Добави ръчно
        </p>

        {customNames.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {customNames.map((name) => (
              <div
                key={name}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px', borderRadius: 8,
                  border: '2px solid #0f0f0f', background: '#0f0f0f', ...font,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{name}</span>
                <button
                  onClick={() => removeCustom(name)}
                  title="Премахни"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <X size={9} color="#fff" strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={customInput}
            onChange={(e) => { setCustomInput(e.target.value); setCustomError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="Ime на бранда..."
            style={{
              height: 36, padding: '0 10px', borderRadius: 8,
              border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', flex: 1, ...font,
            }}
          />
          <button
            onClick={addCustom}
            style={{
              height: 36, padding: '0 14px', borderRadius: 8,
              background: '#0f0f0f', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 600, color: '#fff', flexShrink: 0, ...font,
            }}
          >
            <Plus size={14} />
            Добави
          </button>
        </div>
        {customError && (
          <p style={{ fontSize: 12, color: '#e11d48', marginTop: 6, ...font }}>{customError}</p>
        )}
      </div>

      {categories.map((cat) => {
        const brands = ALL_BRANDS.filter((b) => b.category === cat);
        const isOpen = openCats.has(cat);
        const selectedCount = brands.filter((b) => selected.has(b.id)).length;
        return (
          <div key={cat} style={{ marginBottom: 4, borderBottom: '1px solid #f0f0f0' }}>
            <button
              type="button"
              onClick={() => toggleCat(cat)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 0', ...font,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: '#0f0f0f' }}>
                {BRAND_CATEGORY_LABELS[cat]}
                {selectedCount > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: '#888' }}>({selectedCount})</span>
                )}
              </span>
              {isOpen
                ? <ChevronDown size={14} color="#888" />
                : <ChevronRight size={14} color="#888" />}
            </button>
            {isOpen && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 12 }}>
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
                      <span style={{ fontSize: 12, fontWeight: 400, color: isOn ? '#fff' : '#0f0f0f', lineHeight: 1.3 }}>
                        {brand.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

    </AdminSection>
    </div>
  );
}
