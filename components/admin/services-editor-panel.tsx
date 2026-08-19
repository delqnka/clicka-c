'use client';

import { Clock, Plus, Tag, Users, X } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import type { AdminSitePayload, ServiceItem } from '@/lib/admin-site';
import type { Locale } from '@/lib/i18n';

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

function normalizeOriginalPrice(value: unknown, currentPrice: number): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const normalized = Math.max(0, parsed);
  return normalized > currentPrice ? normalized : undefined;
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

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  const style: CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#000',
    marginBottom: 3,
  };

  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} style={style}>
        {children}
      </label>
    );
  }

  return <span style={style}>{children}</span>;
}

const ServiceCardRow = memo(function ServiceCardRow({
  index,
  svc,
  isMobile,
  T,
  svcInp,
  btn,
  hideCategoryBadge,
  categoryOptions,
  onCommit,
  onRemove,
  locale,
}: {
  index: number;
  svc: ServiceItem;
  isMobile: boolean;
  T: ThemePalette;
  svcInp: CSSProperties;
  btn: ButtonFactory;
  hideCategoryBadge: boolean;
  categoryOptions: string[];
  onCommit: (index: number, next: ServiceItem) => void;
  onRemove: (index: number) => void;
  locale: Locale;
}) {
  const [draft, setDraft] = useState(svc);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Only sync from parent when there's no pending local edit in flight
  useEffect(() => {
    if (!commitTimer.current) setDraft(svc);
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

  const isEn = locale === 'en';
  const variants = mapVariants(draft);
  const categoryLabel = String(draft.category ?? '').trim() || (isEn ? 'Uncategorized' : 'Без категория');
  const fieldPrefix = `service-${svc.id ?? index}`;
  const nameId = `${fieldPrefix}-name-bg`;
  const nameEnId = `${fieldPrefix}-name-en`;
  const categoryId = `${fieldPrefix}-category`;
  const descriptionId = `${fieldPrefix}-description-bg`;
  const descriptionEnId = `${fieldPrefix}-description-en`;
  const requiresConfirmationId = `${fieldPrefix}-requires-confirmation`;

  const fieldInp: CSSProperties = {
    ...svcInp,
    padding: '7px 10px',
    fontSize: 13,
    borderRadius: 8,
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
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
        minWidth: 0,
        maxWidth: '100%',
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) flushCommit();
      }}
    >
      {/* Body */}
      <div style={{ padding: '12px 12px 10px' }}>
        {/* Service name(s) + remove button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <FieldLabel htmlFor={nameId}>{isEn ? 'Name' : 'Наименование (BG)'}</FieldLabel>
              <input
                id={nameId}
                name={nameId}
                autoComplete="off"
                value={draft.name}
                onChange={(e) => updateDraft((s) => ({ ...s, name: e.target.value }))}
                style={{ ...fieldInp, fontWeight: 600, fontSize: 14, color: '#000' }}
                placeholder={isEn ? 'e.g. Haircut, Coloring…' : 'Напр. Подстригване, Боядисване…'}
              />
            </div>
            {/* EN translation — shown only on BG sites */}
            {!isEn && (
              <div>
                <FieldLabel htmlFor={nameEnId}>Name (EN) — optional</FieldLabel>
                <input
                  id={nameEnId}
                  name={nameEnId}
                  autoComplete="off"
                  value={(draft as ServiceItem).nameEn ?? ''}
                  onChange={(e) => updateDraft((s) => ({ ...s, nameEn: e.target.value }))}
                  style={{ ...fieldInp, fontWeight: 600, fontSize: 14, color: '#000' }}
                  placeholder="e.g. Haircut, Coloring…"
                />
              </div>
            )}
          </div>
          <button
            type="button"
            aria-label={isEn ? 'Remove service' : 'Премахни услуга'}
            onClick={() => onRemove(index)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Category badge (when not filtered) */}
        {!hideCategoryBadge ? (
          <div style={{ marginBottom: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 500,
                color: '#555',
                background: '#F4F4F4',
                borderRadius: 6,
                padding: '3px 8px',
              }}
            >
              <Tag size={10} aria-hidden="true" />
              {categoryLabel}
            </span>
          </div>
        ) : null}

        {/* Price + Duration row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr',
            gap: 8,
            marginBottom: 10,
          }}
        >
          {/* Price */}
          <div
            style={{
              border: '1px solid #E8E8E8',
              borderRadius: 10,
              padding: '6px 10px',
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: '#000',
                marginBottom: 2,
              }}
            >
              {isEn ? 'Price' : 'Цена'}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <input
                type="number"
                value={draft.price}
                onChange={(e) =>
                  updateDraft((s) => {
                    const nextPrice = Math.max(0, Number(e.target.value) || 0);
                    return {
                      ...s,
                      price: nextPrice,
                      original_price: normalizeOriginalPrice(s.original_price, nextPrice),
                    };
                  })
                }
                style={{
                  ...numInp,
                  flex: 1,
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  padding: '0',
                  fontSize: 28,
                }}
                aria-label={isEn ? 'Price in euros' : 'Цена в евро'}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#555', flexShrink: 0 }}>€</span>
            </div>
          </div>

          <div
            style={{
              border: '1px solid #E8E8E8',
              borderRadius: 10,
              padding: '6px 10px',
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: '#000',
                marginBottom: 2,
              }}
            >
              {isEn ? 'Old price' : 'Стара цена'}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <input
                type="number"
                value={draft.original_price ?? ''}
                onChange={(e) =>
                  updateDraft((s) => ({
                    ...s,
                    original_price:
                      e.target.value === ''
                        ? undefined
                        : normalizeOriginalPrice(e.target.value, Math.max(0, Number(s.price) || 0)),
                  }))
                }
                style={{
                  ...numInp,
                  flex: 1,
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  padding: '0',
                  fontSize: 28,
                }}
                aria-label={isEn ? 'Old price in euros' : 'Стара цена в евро'}
                placeholder="—"
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#555', flexShrink: 0 }}>€</span>
            </div>
          </div>

          {/* Duration */}
          <div
            style={{
              border: '1px solid #E8E8E8',
              borderRadius: 10,
              padding: '6px 10px',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: '#000',
                marginBottom: 2,
              }}
            >
              <Clock size={11} aria-hidden="true" />
              {isEn ? 'Duration' : 'Времетраене'}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
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
                  fontSize: 28,
                }}
                aria-label={isEn ? 'Duration in minutes' : 'Продължителност в минути'}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#555', flexShrink: 0 }}>{isEn ? 'min' : 'мин'}</span>
            </div>
          </div>

          {/* Capacity */}
          <div
            style={{
              border: '1px solid #E8E8E8',
              borderRadius: 10,
              padding: '6px 10px',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: '#000',
                marginBottom: 2,
              }}
            >
              <Users size={11} aria-hidden="true" />
              {isEn ? 'Capacity' : 'Капацитет'}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <input
                type="number"
                min={1}
                value={draft.capacity ?? 1}
                onChange={(e) =>
                  updateDraft((s) => {
                    const capacity = Math.max(1, Math.round(Number(e.target.value) || 1));
                    return { ...s, capacity: capacity > 1 ? capacity : undefined };
                  })
                }
                style={{
                  ...numInp,
                  flex: 1,
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  padding: '0',
                  fontSize: 28,
                }}
                aria-label={isEn ? 'Bookable capacity' : 'Капацитет за резервации'}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#555', flexShrink: 0 }}>
                {isEn ? 'spots' : 'места'}
              </span>
            </div>
          </div>
        </div>

        {/* Category */}
        <div style={{ marginBottom: 8 }}>
          <FieldLabel htmlFor={categoryId}>{isEn ? 'Category' : 'Категория'}</FieldLabel>
          <input
            id={categoryId}
            name={categoryId}
            autoComplete="off"
            value={draft.category ?? ''}
            list={`cat-options-${index}`}
            onChange={(e) => updateDraft((s) => ({ ...s, category: e.target.value }))}
            style={{ ...fieldInp, color: '#444' }}
            placeholder={isEn ? 'Pick or type a new one…' : 'Избери или напиши нова…'}
            aria-label={isEn ? 'Service category' : 'Категория на услугата'}
          />
          <datalist id={`cat-options-${index}`}>
            {categoryOptions.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 6 }}>
          <FieldLabel htmlFor={descriptionId}>{isEn ? 'Description' : 'Описание (BG)'}</FieldLabel>
          <input
            id={descriptionId}
            name={descriptionId}
            autoComplete="off"
            value={draft.description ?? ''}
            onChange={(e) => updateDraft((s) => ({ ...s, description: e.target.value }))}
            style={{ ...fieldInp, color: '#444' }}
            placeholder={isEn ? 'Short service description (optional)' : 'Кратко описание на услугата (по избор)'}
            aria-label={isEn ? 'Service description' : 'Описание на услугата (BG)'}
          />
        </div>

        {/* EN description — shown only on BG sites */}
        {!isEn && (
          <div style={{ marginBottom: 6 }}>
            <FieldLabel htmlFor={descriptionEnId}>Description (EN) — optional</FieldLabel>
            <input
              id={descriptionEnId}
              name={descriptionEnId}
              autoComplete="off"
              value={(draft as ServiceItem).descriptionEn ?? ''}
              onChange={(e) => updateDraft((s) => ({ ...s, descriptionEn: e.target.value }))}
              style={{ ...fieldInp, color: '#444' }}
              placeholder="Short service description (optional)"
              aria-label="Service description (EN)"
            />
          </div>
        )}

        {/* Payment */}
        <div style={{ marginTop: 8, marginBottom: 4, minWidth: 0 }}>
          <FieldLabel>{isEn ? 'Payment on booking' : 'Плащане при резервация'}</FieldLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {(['none', 'deposit', 'full'] as const).map((pt) => (
              <button
                key={pt}
                type="button"
                onClick={() => updateDraft((s) => ({ ...s, payment_type: pt, ...(pt !== 'deposit' ? { deposit_amount: undefined } : {}) }))}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 20,
                  border: `1.5px solid ${(draft.payment_type ?? 'none') === pt ? '#000' : T.border}`,
                  background: (draft.payment_type ?? 'none') === pt ? '#000' : '#fff',
                  color: (draft.payment_type ?? 'none') === pt ? '#fff' : T.muted,
                  cursor: 'pointer',
                  transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
                }}
              >
                {pt === 'none'
                  ? (isEn ? 'No payment' : 'Без плащане')
                  : pt === 'deposit'
                  ? (isEn ? 'Deposit' : 'Депозит')
                  : (isEn ? 'Full amount' : 'Пълна сума')}
              </button>
            ))}
          </div>
          {(draft.payment_type ?? 'none') === 'deposit' && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 6, flexDirection: isMobile ? 'column' : 'row', minWidth: 0 }}>
              <FieldLabel>{isEn ? 'Deposit amount (€)' : 'Сума на депозита (€)'}</FieldLabel>
              <div style={{ position: 'relative', width: isMobile ? '100%' : 90, minWidth: 0 }}>
                <input
                  type="number"
                  min={1}
                  value={draft.deposit_amount ?? ''}
                  onChange={(e) => updateDraft((s) => ({ ...s, deposit_amount: Math.max(1, Number(e.target.value) || 0) }))}
                  style={{ ...fieldInp, paddingRight: 22, width: '100%' }}
                  placeholder="20"
                  aria-label={isEn ? 'Deposit amount' : 'Сума на депозита'}
                />
                <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#666', pointerEvents: 'none' }}>€</span>
              </div>
            </div>
          )}
        </div>

        {/* Cancellation policy — only relevant when payment is collected */}
        {(draft.payment_type === 'deposit' || draft.payment_type === 'full') && (
          <div style={{ marginTop: 12, padding: '12px 14px', background: '#F9FAFB', borderRadius: 10, border: `1px solid ${T.border}` }}>
            <FieldLabel>{isEn ? 'Cancellation policy' : 'Политика при отказване'}</FieldLabel>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {([24, 48, 72] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => updateDraft((s) => ({ ...s, cancel_policy_hours: h }))}
                  style={{
                    padding: '3px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 20,
                    border: `1.5px solid ${(draft.cancel_policy_hours ?? 24) === h ? '#000' : T.border}`,
                    background: (draft.cancel_policy_hours ?? 24) === h ? '#000' : '#fff',
                    color: (draft.cancel_policy_hours ?? 24) === h ? '#fff' : T.muted,
                    cursor: 'pointer',
                  }}
                >
                  {h === 24 ? (isEn ? '24h' : '24 ч.') : h === 48 ? (isEn ? '48h' : '48 ч.') : (isEn ? '72h' : '72 ч.')}
                </button>
              ))}
              <span style={{ fontSize: 12, color: '#888', alignSelf: 'center' }}>{isEn ? 'free window' : 'безплатен прозорец'}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {((['full_refund', 'keep_deposit', 'keep_full'] as const).filter(
                (a) => a !== 'keep_deposit' || draft.payment_type === 'deposit',
              )).map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => updateDraft((s) => ({ ...s, cancel_policy_action: action }))}
                  style={{
                    padding: '3px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 20,
                    border: `1.5px solid ${(draft.cancel_policy_action ?? 'keep_deposit') === action ? '#000' : T.border}`,
                    background: (draft.cancel_policy_action ?? 'keep_deposit') === action ? '#000' : '#fff',
                    color: (draft.cancel_policy_action ?? 'keep_deposit') === action ? '#fff' : T.muted,
                    cursor: 'pointer',
                  }}
                >
                  {action === 'full_refund'
                    ? (isEn ? 'Full refund' : 'Пълен refund')
                    : action === 'keep_deposit'
                    ? (isEn ? 'Keep deposit' : 'Задържи депозит')
                    : (isEn ? 'No refund' : 'Без refund')}
                </button>
              ))}
              <span style={{ fontSize: 12, color: '#888', alignSelf: 'center' }}>{isEn ? 'after the window' : 'след срока'}</span>
            </div>
          </div>
        )}

        {/* Requires confirmation */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
          <input
            type="checkbox"
            id={requiresConfirmationId}
            name={requiresConfirmationId}
            checked={draft.requires_confirmation === true}
            onChange={(e) => updateDraft((s) => ({ ...s, requires_confirmation: e.target.checked || undefined }))}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#000' }}
          />
          <label htmlFor={requiresConfirmationId} style={{ fontSize: 13, color: '#333', cursor: 'pointer', lineHeight: 1.45, minWidth: 0 }}>
            {isEn
              ? 'Requires my confirmation before the client receives a confirmation'
              : 'Изисква потвърждение от мен преди клиентът да получи потвърждение'}
          </label>
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
              maxWidth: '100%',
              overflowWrap: 'anywhere',
            }}
          >
            <Plus size={13} aria-hidden="true" style={{ color: '#22c55e', flexShrink: 0 }} />
            {isEn ? 'Variants' : 'Варианти'}{variants.length > 0 ? ` (${variants.length})` : ''}
          </summary>
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {variants.map((variant, variantIndex) => (
              <div
                key={`variant-${index}-${variantIndex}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr) 32px' : '1fr 70px 60px 28px',
                  gridTemplateAreas: isMobile
                    ? '"label label label" "price duration remove"'
                    : undefined,
                  gap: 5,
                  alignItems: 'center',
                  minWidth: 0,
                }}
              >
                <input
                  name={`${fieldPrefix}-variant-label-${variantIndex}`}
                  autoComplete="off"
                  value={variant.label}
                  onChange={(e) =>
                    updateDraft((serviceRow) => {
                      const prevVariants = mapVariants(serviceRow);
                      prevVariants[variantIndex] = { ...prevVariants[variantIndex], label: e.target.value };
                      return { ...serviceRow, variants: prevVariants };
                    })
                  }
                  style={{ ...fieldInp, padding: '5px 8px', fontSize: 12, ...(isMobile ? { gridArea: 'label' } : {}) }}
                  placeholder={isEn ? 'Variant' : 'Вариант'}
                  aria-label={isEn ? 'Variant name' : 'Име на вариант'}
                />
                <div style={{ position: 'relative', ...(isMobile ? { gridArea: 'price', minWidth: 0 } : {}) }}>
                  <input
                    type="number"
                    name={`${fieldPrefix}-variant-price-${variantIndex}`}
                    inputMode="decimal"
                    min={0}
                    autoComplete="off"
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
                    aria-label={isEn ? 'Price' : 'Цена'}
                  />
                  <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#666', pointerEvents: 'none' }}>€</span>
                </div>
                <div style={{ position: 'relative', ...(isMobile ? { gridArea: 'duration', minWidth: 0 } : {}) }}>
                  <input
                    type="number"
                    name={`${fieldPrefix}-variant-duration-${variantIndex}`}
                    inputMode="numeric"
                    min={5}
                    autoComplete="off"
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
                    aria-label={isEn ? 'Minutes' : 'Минути'}
                  />
                  <span style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#666', pointerEvents: 'none' }}>{isEn ? 'min' : 'мин'}</span>
                </div>
                <button
                  type="button"
                  style={{ ...btn('ghost'), padding: 4, minWidth: isMobile ? 32 : 28, width: isMobile ? 32 : 28, height: isMobile ? 32 : 28, ...(isMobile ? { gridArea: 'remove' } : {}) }}
                  onClick={() =>
                    updateDraft((serviceRow) => {
                      const nextVariants = mapVariants(serviceRow).filter((_, idx) => idx !== variantIndex);
                      return { ...serviceRow, variants: nextVariants };
                    })
                  }
                  aria-label={isEn ? 'Remove variant' : 'Премахни вариант'}
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
              <Plus size={11} aria-hidden="true" />
              {isEn ? 'Variant' : 'Вариант'}
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
  locale,
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
  locale: Locale;
}) {
  const isEn = locale === 'en';
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

  const allLabel = isEn ? 'All' : 'Всички';
  const categoryOptions = adminServiceCategories
    .map((c) => c.label)
    .filter((l) => l && l !== allLabel);

  if (showGlobalEmpty) {
    return (
      <EmptyState
        title={isEn ? 'No services' : 'Няма услуги'}
        desc={isEn ? 'Add your first service using the button above.' : 'Добави първата си услуга от бутона горе.'}
        T={T}
        isMobile={isMobile}
      />
    );
  }

  return (
    <div style={{ display: 'grid', gap: isMobile ? 10 : 8, minWidth: 0, maxWidth: '100%' }}>
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
            maxWidth: '100%',
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
                  padding: '5px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  lineHeight: 1.4,
                  cursor: 'pointer',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
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
          categoryOptions={categoryOptions}
          onCommit={onCommit}
          onRemove={onRemove}
          locale={locale}
        />
      ))}

      {filteredAdminServices.length === 0 ? (
        <EmptyState
          title={isEn ? 'No services in this category' : 'Няма услуги в категорията'}
          desc={isEn
            ? 'Pick a different category or add a new service to this one.'
            : 'Избери друга категория или добави нова услуга в тази категория.'}
          T={T}
          isMobile={isMobile}
        />
      ) : null}
    </div>
  );
}
