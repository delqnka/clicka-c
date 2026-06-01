'use client';

import { Clock, Plus, Tag, X } from 'lucide-react';
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

function compactInp(base: CSSProperties): CSSProperties {
  return {
    ...base,
    padding: '5px 8px',
    fontSize: 13,
    borderRadius: 7,
  };
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
        padding: isMobile ? '28px 20px' : '24px 16px',
        textAlign: 'center',
        background: isMobile ? '#FAFAFA' : 'transparent',
        border: isMobile ? 'none' : `1px dashed ${T.border}`,
        borderRadius: isMobile ? 16 : T.radiusSm,
      }}
    >
      <p style={{ margin: 0, fontSize: isMobile ? 15 : 13, fontWeight: 600, color: T.muted }}>{title}</p>
      <p style={{ margin: '6px 0 0', fontSize: isMobile ? 13 : 12, color: T.subtle, lineHeight: 1.45 }}>{desc}</p>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'block',
        fontSize: 10,
        fontWeight: 700,
        color: '#000',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 3,
      }}
    >
      {children}
    </span>
  );
}

const ServiceCardRow = memo(function ServiceCardRow({
  index,
  svc,
  isMobile,
  T,
  svcInp,
  btn,
  hideCategoryBadge,
  onCommit,
  onRemove,
}: {
  index: number;
  svc: ServiceItem;
  isMobile: boolean;
  T: ThemePalette;
  svcInp: CSSProperties;
  btn: ButtonFactory;
  hideCategoryBadge: boolean;
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

  const fieldInp: CSSProperties = {
    ...svcInp,
    padding: '7px 10px',
    fontSize: 13,
    borderRadius: 8,
    width: '100%',
    boxSizing: 'border-box',
  };

  const numInp: CSSProperties = {
    ...fieldInp,
    fontWeight: 700,
    fontSize: 15,
    color: '#000',
    textAlign: 'right' as const,
  };

  return (
    <div
      style={{
        border: '1px solid #E8E8E8',
        borderRadius: 14,
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) flushCommit();
      }}
    >
      {/* Header strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px 8px',
          borderBottom: '1px solid #F2F2F2',
          gap: 8,
        }}
      >
        {!hideCategoryBadge ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              fontWeight: 700,
              color: '#000',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              background: '#F4F4F4',
              borderRadius: 6,
              padding: '3px 7px',
            }}
          >
            <Tag size={9} />
            {categoryLabel}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          aria-label="Премахни услуга"
          onClick={() => onRemove(index)}
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            border: '1px solid #EBEBEB',
            background: '#FAFAFA',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 12px 10px' }}>
        {/* Service name */}
        <div style={{ marginBottom: 10 }}>
          <FieldLabel>Наименование</FieldLabel>
          <input
            value={draft.name}
            onChange={(e) => updateDraft((s) => ({ ...s, name: e.target.value }))}
            style={{ ...fieldInp, fontWeight: 600, fontSize: 14, color: '#000' }}
            placeholder="Напр. Подстригване, Боядисване…"
          />
        </div>

        {/* Price + Duration row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 10,
          }}
        >
          {/* Price */}
          <div
            style={{
              background: '#F9F9F9',
              border: '1px solid #EBEBEB',
              borderRadius: 10,
              padding: '8px 10px',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                fontWeight: 700,
                color: '#000',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 4,
              }}
            >
              💳 Цена
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                value={draft.price}
                onChange={(e) => updateDraft((s) => ({ ...s, price: Number(e.target.value) || 0 }))}
                style={{
                  ...numInp,
                  flex: 1,
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  padding: '0',
                }}
                aria-label="Цена в лева"
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#000', flexShrink: 0 }}>лв.</span>
            </div>
          </div>

          {/* Duration */}
          <div
            style={{
              background: '#F9F9F9',
              border: '1px solid #EBEBEB',
              borderRadius: 10,
              padding: '8px 10px',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                fontWeight: 700,
                color: '#000',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 4,
              }}
            >
              <Clock size={10} />
              Времетраене
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                value={draft.duration_min}
                onChange={(e) => updateDraft((s) => ({ ...s, duration_min: Number(e.target.value) || 30 }))}
                style={{
                  ...numInp,
                  flex: 1,
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  padding: '0',
                }}
                aria-label="Продължителност в минути"
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#000', flexShrink: 0 }}>мин</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 8 }}>
          <FieldLabel>Описание</FieldLabel>
          <input
            value={draft.description ?? ''}
            onChange={(e) => updateDraft((s) => ({ ...s, description: e.target.value }))}
            style={{ ...fieldInp, color: '#444' }}
            placeholder="Кратко описание на услугата (по избор)"
            aria-label="Описание на услугата"
          />
        </div>

        {/* Category */}
        <div style={{ marginBottom: 6 }}>
          <FieldLabel>Категория</FieldLabel>
          <input
            value={draft.category ?? ''}
            list="service-category-options"
            onChange={(e) => updateDraft((s) => ({ ...s, category: e.target.value }))}
            style={{ ...fieldInp, color: '#444' }}
            placeholder="Напр. Коса, Маникюр, Грим…"
            aria-label="Категория на услугата"
          />
        </div>

        {/* Variants */}
        <details style={{ marginTop: 8 }}>
          <summary
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#000',
              cursor: 'pointer',
              listStyle: 'none',
              userSelect: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 0',
            }}
          >
            Варианти{variants.length > 0 ? ` (${variants.length})` : ''}
          </summary>
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {variants.map((variant, variantIndex) => (
              <div
                key={`variant-${index}-${variantIndex}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 70px 60px 28px',
                  gap: 5,
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
                  style={{ ...fieldInp, padding: '5px 8px', fontSize: 12 }}
                  placeholder="Вариант"
                />
                <div style={{ position: 'relative' }}>
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
                    style={{ ...fieldInp, padding: '5px 24px 5px 6px', fontSize: 12, fontWeight: 700 }}
                    placeholder="0"
                    aria-label="Цена"
                  />
                  <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#666', pointerEvents: 'none' }}>лв</span>
                </div>
                <div style={{ position: 'relative' }}>
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
                    style={{ ...fieldInp, padding: '5px 26px 5px 6px', fontSize: 12, fontWeight: 700 }}
                    placeholder="30"
                    aria-label="Минути"
                  />
                  <span style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#666', pointerEvents: 'none' }}>мин</span>
                </div>
                <button
                  type="button"
                  style={{ ...btn('ghost'), padding: 4, minWidth: 28, width: 28, height: 28 }}
                  onClick={() =>
                    updateDraft((serviceRow) => {
                      const nextVariants = mapVariants(serviceRow).filter((_, idx) => idx !== variantIndex);
                      return { ...serviceRow, variants: nextVariants };
                    })
                  }
                  aria-label="Премахни вариант"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              style={{
                ...btn('sm-ghost'),
                marginTop: variants.length ? 2 : 0,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                alignSelf: 'start',
              }}
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
              <Plus size={11} />
              Вариант
            </button>
          </div>
        </details>
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

  const hideCategoryBadge = selectedAdminServiceCategory != null;

  if (showGlobalEmpty) {
    return (
      <EmptyState title="Няма услуги" desc="Добави първата си услуга от бутона горе." T={T} isMobile={isMobile} />
    );
  }

  return (
    <div style={{ display: 'grid', gap: isMobile ? 10 : 8 }}>
      {adminServiceCategories.length > 1 ? (
        <div
          style={{
            display: 'flex',
            gap: 5,
            overflowX: 'auto',
            flexWrap: 'nowrap',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: 2,
            marginBottom: 2,
          }}
        >
          {adminServiceCategories.map((cat) => {
            const active = selectedAdminServiceCategory === cat.id;
            return (
              <button
                key={cat.id ?? 'all'}
                type="button"
                onClick={() => setSelectedAdminServiceCategory(cat.id)}
                style={{
                  borderRadius: 999,
                  border: active ? '1.5px solid #000' : '1px solid #E0E0E0',
                  background: active ? '#000' : '#fff',
                  color: active ? '#fff' : '#000',
                  padding: '3px 10px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  lineHeight: 1.4,
                  cursor: 'pointer',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
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
          hideCategoryBadge={hideCategoryBadge}
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
