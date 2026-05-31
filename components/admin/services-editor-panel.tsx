'use client';

import { Plus, X } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import type { AdminSitePayload, ServiceItem } from '@/lib/admin-site';

type ThemePalette = {
  text: string;
  muted: string;
  subtle: string;
  border: string;
  accent: string;
  radiusSm: number;
};

type ButtonFactory = (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;

type ServiceVariant = { label: string; price: number; duration?: number };

const COMMIT_DEBOUNCE_MS = 280;

function mapVariants(serviceRow: ServiceItem): ServiceVariant[] {
  if (!Array.isArray(serviceRow.variants)) return [];
  return serviceRow.variants.map((v) => ({
    label: String(v.label ?? ''),
    price: Math.max(0, Number(v.price) || 0),
    duration:
      v.duration != null && Number.isFinite(Number(v.duration)) ? Math.max(5, Number(v.duration)) : undefined,
  }));
}

function Field({
  label,
  children,
  style,
  T,
  isMobile,
}: {
  label: string;
  children: React.ReactNode;
  style?: CSSProperties;
  T: ThemePalette;
  isMobile: boolean;
}) {
  return (
    <label style={{ display: 'grid', gap: isMobile ? 6 : 5, ...style }}>
      <span style={{ fontSize: isMobile ? 13 : 12, fontWeight: 600, color: T.muted, letterSpacing: '0.01em' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function EmptyState({
  title,
  desc,
  T,
  isMobile,
}: {
  title: string;
  desc: string;
  T: ThemePalette;
  isMobile: boolean;
}) {
  return (
    <div
      style={{
        padding: isMobile ? '40px 24px' : '32px 20px',
        textAlign: 'center',
        background: isMobile ? '#FAFAFA' : 'transparent',
        border: isMobile ? 'none' : `1px dashed ${T.border}`,
        borderRadius: isMobile ? 20 : T.radiusSm,
      }}
    >
      <p style={{ margin: 0, fontSize: isMobile ? 16 : 14, fontWeight: 600, color: T.muted }}>{title}</p>
      <p style={{ margin: '8px 0 0', fontSize: isMobile ? 14 : 13, color: T.subtle, lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}

const ServiceCardRow = memo(function ServiceCardRow({
  index,
  svc,
  isMobile,
  T,
  svcInp,
  btn,
  onCommit,
  onRemove,
}: {
  index: number;
  svc: ServiceItem;
  isMobile: boolean;
  T: ThemePalette;
  svcInp: CSSProperties;
  btn: ButtonFactory;
  onCommit: (index: number, next: ServiceItem) => void;
  onRemove: (index: number) => void;
}) {
  const [draft, setDraft] = useState(svc);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    setDraft(svc);
  }, [svc]);

  const flushCommit = useCallback(() => {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
    onCommit(index, draftRef.current);
  }, [index, onCommit]);

  const updateDraft = useCallback(
    (updater: (prev: ServiceItem) => ServiceItem) => {
      setDraft((prev) => {
        const next = updater(prev);
        draftRef.current = next;
        if (commitTimer.current) clearTimeout(commitTimer.current);
        commitTimer.current = setTimeout(() => onCommit(index, next), COMMIT_DEBOUNCE_MS);
        return next;
      });
    },
    [index, onCommit]
  );

  useEffect(
    () => () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    },
    []
  );

  const variants = mapVariants(draft);
  const categoryLabel = String(draft.category ?? '').trim() || 'Без категория';

  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: isMobile ? 14 : 12,
        padding: isMobile ? '12px 12px' : '12px 12px',
        background: '#fff',
        position: 'relative',
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) flushCommit();
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.subtle, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {categoryLabel}
          </span>
          <button
            type="button"
            aria-label="Премахни услуга"
            onClick={() => onRemove(index)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 999,
              border: 'none',
              background: 'transparent',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: T.subtle,
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr auto auto auto',
            gap: 10,
            alignItems: 'end',
          }}
        >
          <Field label="Услуга" style={isMobile ? { gridColumn: '1 / -1' } : undefined} T={T} isMobile={isMobile}>
            <input
              value={draft.name}
              onChange={(e) => updateDraft((s) => ({ ...s, name: e.target.value }))}
              style={svcInp}
              placeholder="Напр. Подстригване"
            />
          </Field>
          <Field label="Категория" style={isMobile ? { gridColumn: '1 / -1' } : undefined} T={T} isMobile={isMobile}>
            <input
              value={draft.category ?? ''}
              list="service-category-options"
              onChange={(e) => updateDraft((s) => ({ ...s, category: e.target.value }))}
              style={svcInp}
              placeholder="Напр. Коса"
            />
          </Field>
          <Field label="Описание" style={{ gridColumn: '1 / -1' }} T={T} isMobile={isMobile}>
            <input
              value={draft.description ?? ''}
              onChange={(e) => updateDraft((s) => ({ ...s, description: e.target.value }))}
              style={svcInp}
              placeholder="Кратко описание на услугата"
            />
          </Field>
          <Field label="Цена (€)" T={T} isMobile={isMobile}>
            <input
              type="number"
              value={draft.price}
              onChange={(e) => updateDraft((s) => ({ ...s, price: Number(e.target.value) || 0 }))}
              style={{ ...svcInp, width: isMobile ? '100%' : 80 }}
            />
          </Field>
          <Field label="Мин" T={T} isMobile={isMobile}>
            <input
              type="number"
              value={draft.duration_min}
              onChange={(e) => updateDraft((s) => ({ ...s, duration_min: Number(e.target.value) || 30 }))}
              style={{ ...svcInp, width: isMobile ? '100%' : 70 }}
            />
          </Field>
          <div style={{ gridColumn: '1 / -1', marginTop: 2 }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: T.text }}>Варианти (по избор)</p>
            <div style={{ display: 'grid', gap: 6 }}>
              {variants.map((variant, variantIndex) => (
                <div
                  key={`variant-${index}-${variantIndex}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr 90px 90px auto' : '1fr 110px 110px auto',
                    gap: 6,
                    alignItems: 'center',
                  }}
                >
                  <input
                    value={variant.label}
                    onChange={(e) =>
                      updateDraft((serviceRow) => {
                        const prevVariants = mapVariants(serviceRow);
                        prevVariants[variantIndex] = { ...prevVariants[variantIndex], label: e.target.value };
                        return { ...serviceRow, variants: prevVariants };
                      })
                    }
                    style={svcInp}
                    placeholder="Име на вариант"
                  />
                  <input
                    type="number"
                    value={variant.price}
                    onChange={(e) =>
                      updateDraft((serviceRow) => {
                        const prevVariants = mapVariants(serviceRow);
                        prevVariants[variantIndex] = {
                          ...prevVariants[variantIndex],
                          price: Math.max(0, Number(e.target.value) || 0),
                        };
                        return { ...serviceRow, variants: prevVariants };
                      })
                    }
                    style={svcInp}
                    placeholder="€"
                  />
                  <input
                    type="number"
                    value={Number(variant.duration ?? draft.duration_min ?? 30)}
                    onChange={(e) =>
                      updateDraft((serviceRow) => {
                        const prevVariants = mapVariants(serviceRow);
                        prevVariants[variantIndex] = {
                          ...prevVariants[variantIndex],
                          duration: Math.max(5, Number(e.target.value) || 30),
                        };
                        return { ...serviceRow, variants: prevVariants };
                      })
                    }
                    style={svcInp}
                    placeholder="мин"
                  />
                  <button
                    type="button"
                    style={{ ...btn('ghost'), padding: '6px 8px' }}
                    onClick={() =>
                      updateDraft((serviceRow) => {
                        const nextVariants = mapVariants(serviceRow).filter((_, idx) => idx !== variantIndex);
                        return { ...serviceRow, variants: nextVariants };
                      })
                    }
                    aria-label="Премахни вариант"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              style={{ ...btn('ghost'), marginTop: 8 }}
              onClick={() =>
                updateDraft((serviceRow) => {
                  const prevVariants = mapVariants(serviceRow);
                  return {
                    ...serviceRow,
                    variants: [
                      ...prevVariants,
                      {
                        label: '',
                        price: Math.max(0, Number(serviceRow.price) || 0),
                        duration: Math.max(5, Number(serviceRow.duration_min) || 30),
                      },
                    ],
                  };
                })
              }
            >
              <Plus size={13} />
              Добави вариант
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export function ServicesEditorPanel({
  isMobile,
  showGlobalEmpty,
  adminServiceCategories,
  selectedAdminServiceCategory,
  setSelectedAdminServiceCategory,
  filteredAdminServices,
  setSite,
  T,
  svcInp,
  btn,
}: {
  isMobile: boolean;
  showGlobalEmpty: boolean;
  adminServiceCategories: { id: string | null; label: string }[];
  selectedAdminServiceCategory: string | null;
  setSelectedAdminServiceCategory: (id: string | null) => void;
  filteredAdminServices: { svc: ServiceItem; i: number }[];
  setSite: Dispatch<SetStateAction<AdminSitePayload>>;
  T: ThemePalette;
  svcInp: CSSProperties;
  btn: ButtonFactory;
}) {
  const onCommit = useCallback(
    (index: number, next: ServiceItem) => {
      setSite((p) => ({
        ...p,
        services: p.services.map((s, j) => (j === index ? next : s)),
      }));
    },
    [setSite]
  );

  const onRemove = useCallback(
    (index: number) => {
      setSite((p) => ({ ...p, services: p.services.filter((_, j) => j !== index) }));
    },
    [setSite]
  );

  if (showGlobalEmpty) {
    return (
      <EmptyState title="Няма услуги" desc="Добави първата си услуга от бутона горе." T={T} isMobile={isMobile} />
    );
  }

  return (
    <div style={{ display: 'grid', gap: isMobile ? 12 : 10 }}>
      {adminServiceCategories.length > 1 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {adminServiceCategories.map((cat) => {
            const active = selectedAdminServiceCategory === cat.id;
            return (
              <button
                key={cat.id ?? 'all'}
                type="button"
                onClick={() => setSelectedAdminServiceCategory(cat.id)}
                style={{
                  borderRadius: 999,
                  border: active ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                  background: active ? '#F5F3FF' : '#fff',
                  color: active ? T.accent : T.text,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {filteredAdminServices.map(({ svc, i }) => (
        <ServiceCardRow
          key={svc.id ?? `svc-${i}`}
          index={i}
          svc={svc}
          isMobile={isMobile}
          T={T}
          svcInp={svcInp}
          btn={btn}
          onCommit={onCommit}
          onRemove={onRemove}
        />
      ))}

      {filteredAdminServices.length === 0 ? (
        <EmptyState
          title="Няма услуги в категорията"
          desc="Избери друга категория или добави нова услуга в тази категория."
          T={T}
          isMobile={isMobile}
        />
      ) : null}
    </div>
  );
}
