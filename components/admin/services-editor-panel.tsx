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
  const inp = compactInp(svcInp);

  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: '7px 8px',
        background: '#fff',
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) flushCommit();
      }}
    >
      {!hideCategoryBadge ? (
        <span
          style={{
            display: 'block',
            marginBottom: 5,
            fontSize: 9,
            fontWeight: 600,
            color: T.subtle,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {categoryLabel}
        </span>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 58px 52px 22px' : '1fr 68px 58px 22px',
          gap: 6,
          alignItems: 'center',
        }}
      >
        <input
          value={draft.name}
          onChange={(e) => updateDraft((s) => ({ ...s, name: e.target.value }))}
          style={inp}
          placeholder="Услуга"
        />
        <input
          type="number"
          value={draft.price}
          onChange={(e) => updateDraft((s) => ({ ...s, price: Number(e.target.value) || 0 }))}
          style={inp}
          placeholder="€"
          aria-label="Цена в евро"
        />
        <input
          type="number"
          value={draft.duration_min}
          onChange={(e) => updateDraft((s) => ({ ...s, duration_min: Number(e.target.value) || 30 }))}
          style={inp}
          placeholder="мин"
          aria-label="Продължителност в минути"
        />
        <button
          type="button"
          aria-label="Премахни услуга"
          onClick={() => onRemove(index)}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: T.subtle,
            cursor: 'pointer',
          }}
        >
          <X size={13} />
        </button>
      </div>

      <input
        value={draft.category ?? ''}
        list="service-category-options"
        onChange={(e) => updateDraft((s) => ({ ...s, category: e.target.value }))}
        style={{ ...inp, marginTop: 5, fontSize: 11, color: T.muted }}
        placeholder="Категория"
      />

      <details style={{ marginTop: 6 }}>
        <summary
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: T.muted,
            cursor: 'pointer',
            listStyle: 'none',
            userSelect: 'none',
          }}
        >
          Варианти{variants.length > 0 ? ` (${variants.length})` : ''}
        </summary>
        <div style={{ display: 'grid', gap: 5, marginTop: 6 }}>
          {variants.map((variant, variantIndex) => (
            <div
              key={`variant-${index}-${variantIndex}`}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 58px 52px 22px' : '1fr 68px 58px 22px',
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
                style={inp}
                placeholder="Вариант"
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
                style={inp}
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
                style={inp}
                placeholder="мин"
              />
              <button
                type="button"
                style={{ ...btn('ghost'), padding: 4, minWidth: 22, width: 22, height: 22 }}
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
              padding: '4px 8px',
              fontSize: 11,
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
            gap: 6,
            overflowX: 'auto',
            flexWrap: 'nowrap',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: 2,
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
                  border: active ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                  background: active ? '#F5F3FF' : '#fff',
                  color: active ? T.accent : T.text,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
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
