'use client';

import { Plus, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Dispatch, SetStateAction } from 'react';

type DraftVariant = { label: string; price: number; duration_min: number };
type ServiceDraft = {
  name: string;
  category: string;
  description: string;
  price: number;
  duration_min: number;
  variants: DraftVariant[];
};

type ThemePalette = {
  text: string;
  border: string;
};

type ButtonFactory = (
  variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost'
) => CSSProperties;

export function ServiceCreateModal({
  open,
  isMobile,
  T,
  inp,
  btn,
  newServiceDraft,
  setNewServiceDraft,
  onCancel,
  onAdd,
}: {
  open: boolean;
  isMobile: boolean;
  T: ThemePalette;
  inp: CSSProperties;
  btn: ButtonFactory;
  newServiceDraft: ServiceDraft;
  setNewServiceDraft: Dispatch<SetStateAction<ServiceDraft>>;
  onCancel: () => void;
  onAdd: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        overflow: 'hidden',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 16,
      }}
      onClick={onCancel}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.36)' }} aria-hidden />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="add-service-modal-title"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 520,
          maxHeight: isMobile ? 'min(92dvh, 100%)' : 'calc(100dvh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: isMobile ? '20px 20px 0 0' : 16,
          background: '#fff',
          border: `1px solid ${T.border}`,
          overflow: 'hidden',
          ...(isMobile ? { marginTop: 'auto' } : {}),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            padding: 16,
          }}
        >
          <p id="add-service-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>
            Добави услуга
          </p>
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            <div>
              <label style={{ display: 'block', margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: T.text }}>Име</label>
              <input style={inp} value={newServiceDraft.name} onChange={(e) => setNewServiceDraft((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: T.text }}>Категория</label>
              <input
                style={inp}
                value={newServiceDraft.category}
                list="service-category-options"
                onChange={(e) => setNewServiceDraft((p) => ({ ...p, category: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ display: 'block', margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: T.text }}>Описание</label>
              <input style={inp} value={newServiceDraft.description} onChange={(e) => setNewServiceDraft((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: T.text }}>Цена (€)</label>
                <input type="number" style={inp} value={newServiceDraft.price} onChange={(e) => setNewServiceDraft((p) => ({ ...p, price: Number(e.target.value) || 0 }))} />
              </div>
              <div>
                <label style={{ display: 'block', margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: T.text }}>Мин</label>
                <input type="number" style={inp} value={newServiceDraft.duration_min} onChange={(e) => setNewServiceDraft((p) => ({ ...p, duration_min: Number(e.target.value) || 30 }))} />
              </div>
            </div>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: T.text }}>
                Варианти (по избор)
              </p>
              <div style={{ display: 'grid', gap: 6 }}>
                {newServiceDraft.variants.map((variant, idx) => (
                  <div
                    key={`new-service-variant-${idx}`}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px auto', gap: 6, alignItems: 'center' }}
                  >
                    <input
                      style={inp}
                      value={variant.label}
                      onChange={(e) =>
                        setNewServiceDraft((prev) => ({
                          ...prev,
                          variants: prev.variants.map((v, i) => (i === idx ? { ...v, label: e.target.value } : v)),
                        }))
                      }
                      placeholder="Име на вариант"
                    />
                    <input
                      type="number"
                      style={inp}
                      value={variant.price}
                      onChange={(e) =>
                        setNewServiceDraft((prev) => ({
                          ...prev,
                          variants: prev.variants.map((v, i) =>
                            i === idx ? { ...v, price: Math.max(0, Number(e.target.value) || 0) } : v
                          ),
                        }))
                      }
                      placeholder="€"
                    />
                    <input
                      type="number"
                      style={inp}
                      value={variant.duration_min}
                      onChange={(e) =>
                        setNewServiceDraft((prev) => ({
                          ...prev,
                          variants: prev.variants.map((v, i) =>
                            i === idx ? { ...v, duration_min: Math.max(5, Number(e.target.value) || 30) } : v
                          ),
                        }))
                      }
                      placeholder="мин"
                    />
                    <button
                      type="button"
                      style={{ ...btn('ghost'), padding: '6px 8px' }}
                      onClick={() =>
                        setNewServiceDraft((prev) => ({
                          ...prev,
                          variants: prev.variants.filter((_, i) => i !== idx),
                        }))
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
                  setNewServiceDraft((prev) => ({
                    ...prev,
                    variants: [
                      ...prev.variants,
                      {
                        label: '',
                        price: Math.max(0, Number(prev.price) || 0),
                        duration_min: Math.max(5, Number(prev.duration_min) || 30),
                      },
                    ],
                  }))
                }
              >
                <Plus size={13} />
                Добави вариант
              </button>
            </div>
          </div>
        </div>
        <div
          style={{
            flexShrink: 0,
            padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
            borderTop: `1px solid ${T.border}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            background: '#fff',
          }}
        >
          <button type="button" style={btn('ghost')} onClick={onCancel}>Отказ</button>
          <button
            type="button"
            style={{ ...btn('primary'), border: 'none', background: '#000' }}
            onClick={onAdd}
          >
            Добави
          </button>
        </div>
      </div>
    </div>
  );
}
